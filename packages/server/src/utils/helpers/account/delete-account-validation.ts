import {
  account_metadata_table,
  account_table,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "src/db";

export type AccountDeletionBlocker = {
  type: "sole_owner" | "personal_tenant" | "last_account";
  tenantId?: string;
  tenantName?: string;
  message: string;
};

/**
 * Check if an account can be deleted entirely and return any blockers
 */
export async function checkAccountDeletionBlockers(
  accountId: string,
  userId: string
): Promise<AccountDeletionBlocker[]> {
  const blockers: AccountDeletionBlocker[] = [];

  // Get the account to verify it belongs to the user
  const account = await db.query.account_table.findFirst({
    where: and(
      eq(account_table.id, accountId),
      eq(account_table.user_id, userId),
      isNull(account_table.deleted_at)
    ),
  });

  if (!account) {
    throw new Error("Account not found or does not belong to user");
  }

  // Check if this is the last account for the user
  const userAccountsCount = await db
    .select({ count: count() })
    .from(account_table)
    .where(
      and(eq(account_table.user_id, userId), isNull(account_table.deleted_at))
    );

  if (userAccountsCount[0].count <= 1) {
    blockers.push({
      type: "last_account",
      message:
        "Cannot delete your last account. Delete your entire user account instead.",
    });
    // Don't return early - we still want to check for sole owner and billing blockers
  }

  // Get all tenants this account is connected to
  const accountTenants = await db.query.account_metadata_table.findMany({
    where: and(
      eq(account_metadata_table.account_id, accountId),
      isNull(account_metadata_table.deleted_at)
    ),
  });

  // For each tenant, check if this account is the sole owner
  for (const metadata of accountTenants) {
    // Fetch tenant and role separately to avoid Drizzle relation issues
    const tenant = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, metadata.tenant_id),
    });

    const role = await db.query.role_table.findFirst({
      where: eq(role_table.id, metadata.role_id),
    });

    // Skip if tenant is null or deleted
    if (!tenant || tenant.deleted_at) continue;

    // For org tenants, check if account is sole owner
    if (tenant.kind === "org") {
      // Check if this role is an owner role
      const isOwnerRole = role?.kind === "owner";

      if (isOwnerRole) {
        // Count number of owners in this tenant (by role kind, not role_id)
        const allMetadataForTenant =
          await db.query.account_metadata_table.findMany({
            where: and(
              eq(account_metadata_table.tenant_id, tenant.id),
              isNull(account_metadata_table.deleted_at)
            ),
            with: {
              role: true,
            },
          });

        const ownersCount = allMetadataForTenant.filter(
          (m) => m.role.kind === "owner"
        ).length;

        if (ownersCount <= 1) {
          blockers.push({
            type: "sole_owner",
            tenantId: tenant.id,
            tenantName: tenant.name,
            message: `You are the only owner of "${tenant.name}". Promote another member to owner or delete the tenant first.`,
          });
        }
      }
    }
  }

  return blockers;
}

/**
 * Check if an account can be removed from a specific tenant
 */
export async function canRemoveAccountFromTenant(
  accountId: string,
  tenantId: string,
  removedBy: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Get tenant
  const tenant = await db.query.tenant_table.findFirst({
    where: and(eq(tenant_table.id, tenantId), isNull(tenant_table.deleted_at)),
  });

  if (!tenant) {
    return { allowed: false, reason: "Tenant not found" };
  }

  // Cannot remove accounts from personal tenants
  if (tenant && tenant.kind === "personal") {
    return {
      allowed: false,
      reason: "Cannot remove accounts from personal tenants",
    };
  }

  // Check if account exists in tenant
  const metadata = await db.query.account_metadata_table.findFirst({
    where: and(
      eq(account_metadata_table.account_id, accountId),
      eq(account_metadata_table.tenant_id, tenantId),
      isNull(account_metadata_table.deleted_at)
    ),
  });

  if (!metadata) {
    return { allowed: false, reason: "Account not found in tenant" };
  }

  // Fetch role separately
  const role = await db.query.role_table.findFirst({
    where: eq(role_table.id, metadata.role_id),
  });

  // If removing yourself, cannot be the last owner
  const isRemovingSelf = accountId === removedBy;
  const isOwnerRole = role?.kind === "owner";

  if (isRemovingSelf && isOwnerRole) {
    // Count number of owners
    const ownersCount = await db
      .select({ count: count() })
      .from(account_metadata_table)
      .where(
        and(
          eq(account_metadata_table.tenant_id, tenantId),
          eq(account_metadata_table.role_id, metadata.role_id),
          isNull(account_metadata_table.deleted_at)
        )
      );

    if (ownersCount[0].count <= 1) {
      return {
        allowed: false,
        reason:
          "Cannot leave tenant as the only owner. Promote another member to owner or delete the tenant.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if a user can be deleted entirely
 */
export async function checkUserDeletionBlockers(
  userId: string
): Promise<AccountDeletionBlocker[]> {
  const blockers: AccountDeletionBlocker[] = [];

  // Get all accounts for this user
  const userAccounts = await db.query.account_table.findMany({
    where: and(
      eq(account_table.user_id, userId),
      isNull(account_table.deleted_at)
    ),
  });

  // For each account, check its tenant connections
  for (const account of userAccounts) {
    const accountBlockers = await checkAccountDeletionBlockers(
      account.id,
      userId
    );
    // Filter out "last_account" blockers since we're deleting all accounts
    const relevantBlockers = accountBlockers.filter(
      (b) => b.type !== "last_account"
    );
    blockers.push(...relevantBlockers);
  }

  return blockers;
}
