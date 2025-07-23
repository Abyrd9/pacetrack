import { db } from "src/db";
import { role_table, DEFAULT_ROLES, user_table, users_to_tenants_table } from "@pacetrack/schema";

export const createTestUser = async (tenantId: string, email = "test@test.com") => {
  const [user] = await db.insert(user_table).values({
    display_name: "Test User",
    email,
    password: "password",
  }).returning();

  const [role] = await db.insert(role_table).values({
    name: "Test User",
    kind: "user",
    allowed: DEFAULT_ROLES.USER.allowed,
  }).returning();

  await db.insert(users_to_tenants_table).values({
    user_id: user.id,
    tenant_id: tenantId,
    role_id: role.id,
  });

  return user;
};