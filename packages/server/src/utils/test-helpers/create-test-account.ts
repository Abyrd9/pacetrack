import {
  account_metadata_table,
  account_table,
  DEFAULT_ROLES,
  type Role,
  role_table,
  type User,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { db } from "src/db";

interface CreateTestAccountOptions {
  tenantId: string;
  email?: string;
  displayName?: string;
  existingUserId?: string;
  roleKind?: Role["kind"];
}

export const createTestAccount = async (
  options: CreateTestAccountOptions | string, // backward compatibility
  legacyEmail?: string,
  legacyUserDisplayName?: string,
  legacyExistingUserId?: string
) => {
  // Handle both new object syntax and legacy parameter syntax
  const config =
    typeof options === "string"
      ? {
          tenantId: options,
          email: legacyEmail ?? "test@test.com",
          userDisplayName: legacyUserDisplayName ?? "Test User",
          existingUserId: legacyExistingUserId,
          roleKind: "member" as const,
        }
      : {
          email: "test@test.com",
          userDisplayName: "Test User",
          roleKind: "member" as const,
          ...options,
        };

  // First create a User (top-level identity) if not using existing
  let user: User;
  if (config.existingUserId) {
    const foundUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, config.existingUserId),
    });
    if (!foundUser) {
      throw new Error(`User with id ${config.existingUserId} not found`);
    }
    user = foundUser;
  } else {
    const [newUser] = await db.insert(user_table).values({}).returning();
    user = newUser;
  }

  // Then create an Account (email/credentials) linked to the User
  const [account] = await db
    .insert(account_table)
    .values({
      user_id: user.id,
      email: config.email,
      password: "password", // hashed password would be better for real tests
      display_name: config.displayName,
    })
    .returning();

  // Get the appropriate default role configuration
  const roleConfig =
    DEFAULT_ROLES[config.roleKind.toUpperCase() as keyof typeof DEFAULT_ROLES];

  // Create a role for the account
  const [role] = await db
    .insert(role_table)
    .values({
      name: roleConfig.name,
      kind: roleConfig.kind,
      allowed: roleConfig.allowed,
    })
    .returning();

  // Link the account to the tenant with the role
  await db.insert(account_metadata_table).values({
    user_id: user.id,
    account_id: account.id,
    tenant_id: config.tenantId,
    role_id: role.id,
  });

  return { user, account, role };
};
