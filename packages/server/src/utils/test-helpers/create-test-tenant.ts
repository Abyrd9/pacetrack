import {
  type Account,
  account_metadata_table,
  account_table,
  DEFAULT_ROLES,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { db } from "src/db";

export async function createTestTenant(
  userId: string,
  tenantName = "Test Organization",
  accountId?: string
) {
  return await db.transaction(async (tx) => {
    // Find or create account if not provided
    let account: Account | undefined;
    if (accountId) {
      account = await tx.query.account_table.findFirst({
        where: (account, { eq }) => eq(account.id, accountId),
      });
    }

    if (!account) {
      // Create a basic account linked to the user
      const [newAccount] = await tx
        .insert(account_table)
        .values({
          user_id: userId,
          email: `test-${userId}@test.com`,
          password: "password",
        })
        .returning();
      account = newAccount;
    }

    // Create tenant
    const [tenant] = await tx
      .insert(tenant_table)
      .values({
        name: tenantName,
        created_by: userId,
        kind: "org",
      })
      .returning();

    // Create the Owner role for this tenant
    const [role] = await tx
      .insert(role_table)
      .values({
        name: DEFAULT_ROLES.OWNER.name,
        kind: DEFAULT_ROLES.OWNER.kind,
        allowed: DEFAULT_ROLES.OWNER.allowed,
      })
      .returning();

    // Add the account to the tenant with the Owner role
    await tx.insert(account_metadata_table).values({
      user_id: userId,
      account_id: account.id,
      tenant_id: tenant.id,
      role_id: role.id,
    });

    return { tenant, account, role };
  });
}
