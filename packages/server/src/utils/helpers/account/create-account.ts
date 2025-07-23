import {
  type Account,
  account_metadata_table,
  account_table,
  DEFAULT_ROLES,
  type Role,
  role_table,
  type Tenant,
  tenant_table,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import type { Transaction } from "src/db";
import { db } from "src/db";

export type CreateAccountOptions = {
  userId: string;
  email: string;
  password: string;
  tx?: Transaction;
};

export type CreateAccountResult = {
  account: Account;
  tenant: Tenant;
  role: Role;
};

/**
 * Creates a new account with personal tenant and owner role.
 */
export async function createAccount({
  userId,
  email,
  password,
  tx: passedInTx,
}: CreateAccountOptions): Promise<CreateAccountResult> {
  const create = async (tx: Transaction) => {
    // Hash the password
    const hashedPassword = await Bun.password.hash(password);

    // Create the account
    const accountResult = await tx
      .insert(account_table)
      .values({
        user_id: userId,
        email,
        password: hashedPassword,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    if (accountResult.length === 0) {
      throw new Error("Account not created");
    }

    const account = accountResult[0];

    // Create personal tenant
    const tenantResult = await tx
      .insert(tenant_table)
      .values({
        name: "Personal",
        created_by: userId,
        kind: "personal",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    if (tenantResult.length === 0) {
      throw new Error("Tenant not created");
    }

    const tenant = tenantResult[0];

    // Create owner role
    const ownerRoleResult = await tx
      .insert(role_table)
      .values({
        ...DEFAULT_ROLES.OWNER,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    if (ownerRoleResult.length === 0) {
      throw new Error("Role not created");
    }

    const role = ownerRoleResult[0];

    // Create account metadata
    await tx.insert(account_metadata_table).values({
      user_id: userId,
      account_id: account.id,
      tenant_id: tenant.id,
      role_id: role.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    return {
      account,
      tenant,
      role,
    };
  };

  // If transaction provided, use it directly, otherwise wrap in transaction
  if (passedInTx) {
    return create(passedInTx);
  }

  return db.transaction(async (newTx) => create(newTx));
}
