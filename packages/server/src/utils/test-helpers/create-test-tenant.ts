import {
  DEFAULT_ROLES,
  account_table,
  role_table,
  tenant_table,
  users_to_tenants_table,
  type Account,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { db } from "src/db";

export async function createTestTenant(
  userId: string,
  tenantName = "Test Organization",
  accountId?: string
) {
  return await db.transaction(async (tx) => {
    // Create account if not provided
    let account: Account | undefined;
    if (accountId) {
      account = await tx.query.account_table.findFirst({
        where: (account, { eq }) => eq(account.id, accountId),
      });
    }

    if (!account) {
      const [newAccount] = await tx
        .insert(account_table)
        .values({
          created_by: userId,
          customer_id: "cus_test",
          subscription_id: "sub_test",
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning();
      account = newAccount;
    }

    // Create tenant
    const [tenant] = await tx
      .insert(tenant_table)
      .values({
        name: tenantName,
        account_id: account.id,
        created_by: userId,
        kind: "org",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    // Create the Owner role for this tenant
    const [role] = await tx
      .insert(role_table)
      .values({
        name: DEFAULT_ROLES.OWNER.name,
        kind: DEFAULT_ROLES.OWNER.kind,
        allowed: DEFAULT_ROLES.OWNER.allowed,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    // Add the user to the tenant with the Owner role
    await tx.insert(users_to_tenants_table).values({
      user_id: userId,
      tenant_id: tenant.id,
      role_id: role.id,
      is_primary_contact: true,
      is_billing_contact: true,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    return { tenant, account, role };
  });
}
