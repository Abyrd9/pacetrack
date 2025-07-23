import {
  type Account,
  account_group_table,
  account_metadata_table,
  account_to_account_group_table,
  membership_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "src/db";
import { getSessionClient } from "../auth/auth-session";
import { notifyTenantMembers } from "../email/deletion-emails";
import { getRedisClient } from "../redis";
import { cancelSubscription } from "../stripe/cancel-subscription";

export type TenantDeletionBlocker = {
  type: "personal_tenant" | "has_members" | "active_subscription";
  message: string;
  memberCount?: number;
  subscriptionId?: string;
};

/**
 * Check if a tenant can be deleted
 */
export async function checkTenantDeletionBlockers(
  tenantId: string
): Promise<TenantDeletionBlocker[]> {
  const blockers: TenantDeletionBlocker[] = [];

  // Get tenant
  const tenant = await db.query.tenant_table.findFirst({
    where: and(eq(tenant_table.id, tenantId), isNull(tenant_table.deleted_at)),
    with: {
      membership: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Cannot delete personal tenants
  if (tenant.kind === "personal") {
    blockers.push({
      type: "personal_tenant",
      message:
        "Personal tenants cannot be deleted. Delete your user account instead.",
    });
    return blockers; // Early return
  }

  // Count active members
  const membersCount = await db
    .select({ count: count() })
    .from(account_metadata_table)
    .where(
      and(
        eq(account_metadata_table.tenant_id, tenantId),
        isNull(account_metadata_table.deleted_at)
      )
    );

  // Note: This is not a blocker, just informational for the UI
  if (membersCount[0].count > 1) {
    blockers.push({
      type: "has_members",
      message: `This tenant has ${membersCount[0].count} members. They will all lose access.`,
      memberCount: membersCount[0].count,
    });
  }

  // Check for active subscription
  if (tenant.membership.subscription_id) {
    blockers.push({
      type: "active_subscription",
      message: "This tenant has an active subscription. It will be cancelled.",
      subscriptionId: tenant.membership.subscription_id,
    });
  }

  return blockers;
}

/**
 * Delete a tenant entirely (org tenants only)
 */
export async function deleteTenantEntirely(
  tenantId: string,
  deletedBy: string
): Promise<void> {
  // Check for hard blockers
  const blockers = await checkTenantDeletionBlockers(tenantId);
  const hasPersonalTenantBlocker = blockers.some(
    (b) => b.type === "personal_tenant"
  );

  if (hasPersonalTenantBlocker) {
    throw new Error("Cannot delete personal tenant");
  }

  // Get affected users and tenant info BEFORE deletion for notifications
  const affectedUsers = await db.query.account_metadata_table.findMany({
    where: and(
      eq(account_metadata_table.tenant_id, tenantId),
      isNull(account_metadata_table.deleted_at)
    ),
    with: {
      account: true,
    },
  });

  const uniqueUserIds = Array.from(
    new Set(
      affectedUsers
        .map((meta) => (meta.account as Account | null)?.user_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const deletedTenant = await db.query.tenant_table.findFirst({
    where: eq(tenant_table.id, tenantId),
  });

  await db.transaction(async (tx) => {
    // Get tenant with membership
    const tenantWithMembership = await tx
      .select({
        tenant: tenant_table,
        membership: membership_table,
      })
      .from(tenant_table)
      .leftJoin(
        membership_table,
        eq(tenant_table.membership_id, membership_table.id)
      )
      .where(eq(tenant_table.id, tenantId))
      .limit(1);

    if (!tenantWithMembership) {
      throw new Error("Tenant not found");
    }

    const tenant = tenantWithMembership[0].tenant;
    const membership = tenantWithMembership[0].membership;

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Soft delete tenant
    await tx
      .update(tenant_table)
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_by: deletedBy,
      })
      .where(eq(tenant_table.id, tenantId));

    // Soft delete all account_metadata for this tenant
    await tx
      .update(account_metadata_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(account_metadata_table.tenant_id, tenantId));

    // Get all account groups in this tenant
    const accountGroups = await tx.query.account_group_table.findMany({
      where: and(
        eq(account_group_table.tenant_id, tenantId),
        isNull(account_group_table.deleted_at)
      ),
    });

    // Soft delete all account groups
    await tx
      .update(account_group_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(account_group_table.tenant_id, tenantId));

    // Soft delete all account_to_account_group entries for these groups
    for (const group of accountGroups) {
      await tx
        .update(account_to_account_group_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(account_to_account_group_table.account_group_id, group.id));
    }

    if (membership) {
      // Cancel Stripe subscription before soft-deleting membership
      if (membership?.subscription_id) {
        await cancelSubscription(membership.subscription_id);
      }

      // Soft delete membership
      await tx
        .update(membership_table)
        .set({
          deleted_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_by: deletedBy,
        })
        .where(eq(membership_table.id, membership.id));
    }
  });

  // Send email notifications to all affected members
  // This is async but we don't await - fire and forget
  if (deletedTenant) {
    notifyTenantMembers(affectedUsers, deletedTenant.name, deletedBy);
  }

  // Update sessions for all affected users
  for (const userId of uniqueUserIds) {
    await removeTenantFromUserSessions(userId, tenantId);
  }
}

/**
 * Remove a tenant from all of a user's sessions
 */
async function removeTenantFromUserSessions(
  userId: string,
  tenantId: string
): Promise<void> {
  const redis = getRedisClient();
  const sessions = await getSessionClient().listUserSessions({ userId });

  for (const session of sessions) {
    // Remove all combinations with this tenant_id
    session.active_accounts = session.active_accounts.filter(
      (combo) => combo.tenant_id !== tenantId
    );

    // If session is currently on this tenant, switch to personal tenant
    if (session.tenant_id === tenantId) {
      const personalTenant = await db.query.tenant_table.findFirst({
        where: and(
          eq(tenant_table.kind, "personal"),
          eq(tenant_table.created_by, userId),
          isNull(tenant_table.deleted_at)
        ),
      });

      if (personalTenant) {
        // Find an account/tenant combination for personal tenant
        const personalCombo = session.active_accounts.find(
          (combo) => combo.tenant_id === personalTenant.id
        );

        if (personalCombo) {
          session.account_id = personalCombo.account_id;
          session.tenant_id = personalCombo.tenant_id;
          session.role_id = personalCombo.role_id;
        } else {
          // No valid combinations left, revoke session
          session.revoked_at = Date.now();
        }
      } else {
        // No personal tenant found (shouldn't happen), revoke session
        session.revoked_at = Date.now();
      }
    }

    // If no active accounts left, revoke session
    if (session.active_accounts.length === 0) {
      session.revoked_at = Date.now();
    }

    await redis.set(`session:${session.id}`, JSON.stringify(session));
  }
}
