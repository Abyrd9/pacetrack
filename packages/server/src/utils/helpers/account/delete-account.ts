import {
  account_group_table,
  account_metadata_table,
  account_table,
  account_to_account_group_table,
  role_table,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "src/db";
import { getSessionClient } from "../auth/auth-session";
import {
  notifyUserDeletion,
  sendAccountRemovedEmail,
} from "../email/deletion-emails";
import { getRedisClient } from "../redis";
import {
  checkAccountDeletionBlockers,
  checkUserDeletionBlockers,
} from "./delete-account-validation";

/**
 * Remove an account from a specific tenant (kick user from tenant)
 */
export async function removeAccountFromTenant(
  accountId: string,
  tenantId: string,
  _removedBy: string,
  wasVoluntary = false
): Promise<void> {
  // Get account and tenant info before deletion for email notification
  const account = await db.query.account_table.findFirst({
    where: eq(account_table.id, accountId),
  });

  const tenant = await db.query.tenant_table.findFirst({
    where: eq(tenant_table.id, tenantId),
  });

  await db.transaction(async (tx) => {
    // Get the role_id before deleting account_metadata
    const metadata = await tx.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, accountId),
        eq(account_metadata_table.tenant_id, tenantId),
        isNull(account_metadata_table.deleted_at)
      ),
    });

    // Soft delete the account_metadata entry
    await tx
      .update(account_metadata_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(
        and(
          eq(account_metadata_table.account_id, accountId),
          eq(account_metadata_table.tenant_id, tenantId)
        )
      );

    // Soft delete the associated role (only if not used by other account_metadata)
    if (metadata?.role_id) {
      const otherUsages = await tx.query.account_metadata_table.findMany({
        where: and(
          eq(account_metadata_table.role_id, metadata.role_id),
          isNull(account_metadata_table.deleted_at)
        ),
      });

      // Only delete role if no other account_metadata entries are using it
      if (otherUsages.length === 0) {
        await tx
          .update(role_table)
          .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
          .where(eq(role_table.id, metadata.role_id));
      }
    }

    // Remove from all account groups in this tenant
    const accountGroups = await tx.query.account_group_table.findMany({
      where: eq(account_group_table.tenant_id, tenantId),
    });

    for (const group of accountGroups) {
      await tx
        .update(account_to_account_group_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(
          and(
            eq(account_to_account_group_table.account_id, accountId),
            eq(account_to_account_group_table.account_group_id, group.id)
          )
        );
    }
  });

  // Send email notification to the removed account
  // Fire and forget - don't block on email delivery
  if (account?.email && tenant?.name) {
    sendAccountRemovedEmail(account.email, tenant.name, wasVoluntary);
  }

  // Update sessions for this account
  await removeAccountTenantFromSessions(accountId, tenantId);
}

/**
 * Delete an account entirely (all tenant connections)
 */
export async function deleteAccountEntirely(
  accountId: string,
  userId: string
): Promise<void> {
  // First check for blockers
  const blockers = await checkAccountDeletionBlockers(accountId, userId);
  if (blockers.length > 0) {
    throw new Error(
      `Cannot delete account: ${blockers.map((b) => b.message).join(", ")}`
    );
  }

  await db.transaction(async (tx) => {
    // Get all role_ids before deleting account_metadata
    const metadataEntries = await tx.query.account_metadata_table.findMany({
      where: and(
        eq(account_metadata_table.account_id, accountId),
        isNull(account_metadata_table.deleted_at)
      ),
    });
    const roleIds = metadataEntries.map((m) => m.role_id);

    // Soft delete the account
    await tx
      .update(account_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(account_table.id, accountId));

    // Soft delete all account_metadata entries
    await tx
      .update(account_metadata_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(account_metadata_table.account_id, accountId));

    // Soft delete all associated roles (only if not used by other account_metadata)
    for (const roleId of roleIds) {
      const otherUsages = await tx.query.account_metadata_table.findMany({
        where: and(
          eq(account_metadata_table.role_id, roleId),
          isNull(account_metadata_table.deleted_at)
        ),
      });

      // Only delete role if no other account_metadata entries are using it
      if (otherUsages.length === 0) {
        await tx
          .update(role_table)
          .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
          .where(eq(role_table.id, roleId));
      }
    }

    // Remove from all account groups
    await tx
      .update(account_to_account_group_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(account_to_account_group_table.account_id, accountId));
  });

  // Update all sessions for this user
  await removeAccountFromAllSessions(userId, accountId);
}

/**
 * Delete a user entirely (nuclear option)
 */
export async function deleteUserEntirely(userId: string): Promise<void> {
  // First check for blockers
  const blockers = await checkUserDeletionBlockers(userId);
  if (blockers.length > 0) {
    throw new Error(
      `Cannot delete user: ${blockers.map((b) => b.message).join(", ")}`
    );
  }

  // Get accounts before deletion for email notification
  const accountsForEmail = await db.query.account_table.findMany({
    where: and(
      eq(account_table.user_id, userId),
      isNull(account_table.deleted_at)
    ),
  });

  await db.transaction(async (tx) => {
    // Get all accounts for this user
    const userAccounts = await tx.query.account_table.findMany({
      where: and(
        eq(account_table.user_id, userId),
        isNull(account_table.deleted_at)
      ),
    });

    // Get all personal tenants for this user
    const personalTenants = await tx.query.tenant_table.findMany({
      where: and(
        eq(tenant_table.created_by, userId),
        eq(tenant_table.kind, "personal"),
        isNull(tenant_table.deleted_at)
      ),
    });

    // Delete all personal tenants
    for (const tenant of personalTenants) {
      // Soft delete tenant
      await tx
        .update(tenant_table)
        .set({
          deleted_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_by: userId,
        })
        .where(eq(tenant_table.id, tenant.id));

      // Soft delete all account groups in this tenant
      await tx
        .update(account_group_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(account_group_table.tenant_id, tenant.id));

      // Soft delete all account-to-account-group entries for this tenant's groups
      const tenantGroups = await tx.query.account_group_table.findMany({
        where: eq(account_group_table.tenant_id, tenant.id),
      });

      for (const group of tenantGroups) {
        await tx
          .update(account_to_account_group_table)
          .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
          .where(eq(account_to_account_group_table.account_group_id, group.id));
      }
    }

    // Delete all accounts
    for (const account of userAccounts) {
      // Get all role_ids for this account before deleting account_metadata
      const metadataEntries = await tx.query.account_metadata_table.findMany({
        where: and(
          eq(account_metadata_table.account_id, account.id),
          isNull(account_metadata_table.deleted_at)
        ),
      });
      const roleIds = metadataEntries.map((m) => m.role_id);

      // Soft delete account
      await tx
        .update(account_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(account_table.id, account.id));

      // Soft delete all account_metadata
      await tx
        .update(account_metadata_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(account_metadata_table.account_id, account.id));

      // Soft delete all associated roles (only if not used by other account_metadata)
      for (const roleId of roleIds) {
        const otherUsages = await tx.query.account_metadata_table.findMany({
          where: and(
            eq(account_metadata_table.role_id, roleId),
            isNull(account_metadata_table.deleted_at)
          ),
        });

        // Only delete role if no other account_metadata entries are using it
        if (otherUsages.length === 0) {
          await tx
            .update(role_table)
            .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
            .where(eq(role_table.id, roleId));
        }
      }

      // Remove from all account groups
      await tx
        .update(account_to_account_group_table)
        .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
        .where(eq(account_to_account_group_table.account_id, account.id));
    }

    // Soft delete user
    await tx
      .update(user_table)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(user_table.id, userId));
  });

  // Send email notifications to all email addresses
  // Fire and forget - don't block on email delivery
  const personalTenantCount = await db.query.tenant_table
    .findMany({
      where: and(
        eq(tenant_table.created_by, userId),
        eq(tenant_table.kind, "personal")
      ),
    })
    .then((tenants) => tenants.length);

  notifyUserDeletion(accountsForEmail, personalTenantCount);

  // Revoke all sessions for this user
  await revokeAllUserSessions(userId);
}

/**
 * Remove a specific account/tenant combination from all sessions
 */
async function removeAccountTenantFromSessions(
  accountId: string,
  tenantId: string
): Promise<void> {
  const redis = getRedisClient();

  // Get the user_id from the account
  const account = await db.query.account_table.findFirst({
    where: eq(account_table.id, accountId),
  });

  if (!account) return;

  // Get all sessions for this user
  const sessions = await getSessionClient().listUserSessions({
    userId: account.user_id,
  });

  for (const session of sessions) {
    // Remove this combination from active_accounts
    session.active_accounts = session.active_accounts.filter(
      (combo) =>
        !(combo.account_id === accountId && combo.tenant_id === tenantId)
    );

    // If the session is currently using this account/tenant, switch to personal tenant
    if (session.account_id === accountId && session.tenant_id === tenantId) {
      const personalTenant = await db.query.tenant_table.findFirst({
        where: and(
          eq(tenant_table.kind, "personal"),
          eq(tenant_table.created_by, account.user_id),
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
      }
    }

    // If no active accounts left, revoke session
    if (session.active_accounts.length === 0) {
      session.revoked_at = Date.now();
    }

    // Update session in Redis
    await redis.set(`session:${session.id}`, JSON.stringify(session));
  }
}

/**
 * Remove all instances of an account from all sessions
 */
async function removeAccountFromAllSessions(
  userId: string,
  accountId: string
): Promise<void> {
  const redis = getRedisClient();
  const sessions = await getSessionClient().listUserSessions({ userId });

  for (const session of sessions) {
    // Remove all combinations with this account_id
    session.active_accounts = session.active_accounts.filter(
      (combo) => combo.account_id !== accountId
    );

    // If session is currently using this account, switch to another account
    if (session.account_id === accountId) {
      if (session.active_accounts.length > 0) {
        // Switch to first available account
        const firstCombo = session.active_accounts[0];
        session.account_id = firstCombo.account_id;
        session.tenant_id = firstCombo.tenant_id;
        session.role_id = firstCombo.role_id;
      } else {
        // No accounts left, revoke session
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

/**
 * Revoke all sessions for a user
 */
async function revokeAllUserSessions(userId: string): Promise<void> {
  const redis = getRedisClient();
  const sessions = await getSessionClient().listUserSessions({ userId });

  for (const session of sessions) {
    session.revoked_at = Date.now();
    await redis.set(`session:${session.id}`, JSON.stringify(session));
  }
}
