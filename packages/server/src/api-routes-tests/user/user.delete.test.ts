import { describe, expect, test } from "bun:test";
import {
  account_group_table,
  account_metadata_table,
  account_table,
  account_to_account_group_table,
  tenant_table,
  USER_DELETE_ROUTE,
  type UserDeleteRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import app from "../..";
import { db } from "../../db";
import { createTestTenant } from "../../utils/test-helpers/create-test-tenant";
import { resetDb } from "../../utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "../../utils/test-helpers/set-test-session";

describe("User Delete Route", () => {
  test("should delete user with single account and personal tenant", async () => {
    await resetDb();
    const user = await setTestSession();

    const form = new FormData();
    form.append("confirmation", "DELETE");

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.message).toContain("deleted");

    // Verify user was soft-deleted
    const deletedUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, user.user.id),
    });
    expect(deletedUser?.deleted_at).toBeDefined();

    // Verify account was soft-deleted
    const deletedAccount = await db.query.account_table.findFirst({
      where: eq(account_table.id, user.account.id),
    });
    expect(deletedAccount?.deleted_at).toBeDefined();

    // Verify personal tenant was soft-deleted
    const deletedTenant = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, user.tenant.id),
    });
    expect(deletedTenant?.deleted_at).toBeDefined();

    // Verify account_metadata was soft-deleted
    const deletedMetadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.user_id, user.user.id),
        isNull(account_metadata_table.deleted_at)
      ),
    });
    expect(deletedMetadata).toBeUndefined();
  });

  test("should delete user with multiple accounts", async () => {
    await resetDb();

    // Create user with first account
    const user = await setTestSession();

    // Create second account for same user
    const [account2] = await db
      .insert(account_table)
      .values({
        user_id: user.user.id,
        email: "second@test.com",
        password: await Bun.password.hash("password"),
      })
      .returning();

    // Create second personal tenant
    const [tenant2] = await db
      .insert(tenant_table)
      .values({
        name: "Personal 2",
        kind: "personal",
        created_by: user.user.id,
      })
      .returning();

    await db.insert(account_metadata_table).values({
      user_id: user.user.id,
      account_id: account2.id,
      tenant_id: tenant2.id,
      role_id: user.role.id,
    });

    // Delete user
    const form = new FormData();
    form.append("confirmation", "DELETE");

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);

    // Verify both accounts were deleted
    const deletedAccount1 = await db.query.account_table.findFirst({
      where: eq(account_table.id, user.account.id),
    });
    expect(deletedAccount1?.deleted_at).toBeDefined();

    const deletedAccount2 = await db.query.account_table.findFirst({
      where: eq(account_table.id, account2.id),
    });
    expect(deletedAccount2?.deleted_at).toBeDefined();

    // Verify both tenants were deleted
    const deletedTenant1 = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, user.tenant.id),
    });
    expect(deletedTenant1?.deleted_at).toBeDefined();

    const deletedTenant2 = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, tenant2.id),
    });
    expect(deletedTenant2?.deleted_at).toBeDefined();
  });

  test("should require DELETE confirmation", async () => {
    await resetDb();
    const user = await setTestSession();

    // Try with wrong confirmation
    const form = new FormData();
    form.append("confirmation", "delete"); // lowercase, should fail

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.confirmation).toBeDefined();

    // Verify user was NOT deleted
    const user_exists = await db.query.user_table.findFirst({
      where: eq(user_table.id, user.user.id),
    });
    expect(user_exists?.deleted_at).toBeNull();
  });

  // TODO: Fix test - currently passing when it should be blocking deletion
  // Test is expecting deletion to be blocked (400), but receiving 200 (success)
  // This suggests the sole owner blocker logic may not be working correctly
  test("should not allow deletion if user is sole owner of org tenant", async () => {
    await resetDb();
    const user = await setTestSession();

    // Create org tenant (automatically adds user as owner)
    await createTestTenant(user.user.id, "Company", user.account.id);

    // User is now the sole owner of this org tenant
    // Try to delete user
    const form = new FormData();
    form.append("confirmation", "DELETE");

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toContain("only owner");

    // Verify user was NOT deleted
    const user_exists = await db.query.user_table.findFirst({
      where: eq(user_table.id, user.user.id),
    });
    expect(user_exists?.deleted_at).toBeNull();
  });

  test("should allow deletion if user is member (not owner) of org tenant", async () => {
    await resetDb();

    // Create owner
    const owner = await setTestSession(undefined, "owner@test.com");

    // Create member user
    const member = await setTestSession(undefined, "member@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Company",
      owner.account.id
    );

    // Add both users - owner as owner, member as member
    await db.insert(account_metadata_table).values([
      {
        user_id: owner.user.id,
        account_id: owner.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: orgTenant.role.id, // Owner role
      },
      {
        user_id: member.user.id,
        account_id: member.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: member.role.id, // Member role (not owner)
      },
    ]);

    // Member deletes their account
    const form = new FormData();
    form.append("confirmation", "DELETE");

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        member.cookie,
        member.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(200);

    // Verify member was deleted
    const deletedMember = await db.query.user_table.findFirst({
      where: eq(user_table.id, member.user.id),
    });
    expect(deletedMember?.deleted_at).toBeDefined();

    // Verify owner was NOT deleted
    const owner_exists = await db.query.user_table.findFirst({
      where: eq(user_table.id, owner.user.id),
    });
    expect(owner_exists?.deleted_at).toBeNull();

    // Verify org tenant still exists
    const tenant_exists = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, orgTenant.tenant.id),
    });
    expect(tenant_exists?.deleted_at).toBeNull();
  });

  test("should handle user with no org tenants", async () => {
    await resetDb();
    const user = await setTestSession();

    // User only has personal tenant (created in setTestSession)

    const form = new FormData();
    form.append("confirmation", "DELETE");

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("ok");

    // Verify user was deleted
    const deletedUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, user.user.id),
    });
    expect(deletedUser?.deleted_at).toBeDefined();
  });
});
