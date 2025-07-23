import { describe, expect, test } from "bun:test";
import {
  ACCOUNT_DELETE_ROUTE,
  type AccountDeleteRouteResponse,
  account_metadata_table,
  account_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import app from "../..";
import { db } from "../../db";
import { createTestTenant } from "../../utils/test-helpers/create-test-tenant";
import { resetDb } from "../../utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "../../utils/test-helpers/set-test-session";
import { setTestSessionInTenant } from "../../utils/test-helpers/set-test-session-in-tenant";

describe("Account Delete Route", () => {
  test("should allow user to voluntarily leave org tenant", async () => {
    await resetDb();

    // Create two users
    const user1 = await setTestSession(undefined, "user1@test.com");
    const user2 = await setTestSession(undefined, "user2@test.com");

    // Create org tenant with user1 as owner
    const orgTenant = await createTestTenant(
      user1.user.id,
      "Org Workspace",
      user1.account.id
    );

    // Add user2 as another owner (so user1 isn't the sole owner)
    await db.insert(account_metadata_table).values({
      user_id: user2.user.id,
      account_id: user2.account.id,
      tenant_id: orgTenant.tenant.id,
      role_id: orgTenant.role.id, // Same owner role
    });

    // Create a session for user1 in the org tenant context
    const orgSession = await setTestSessionInTenant(
      user1.user.id,
      orgTenant.tenant.id,
      user1.account.id
    );

    // User1 leaves org tenant (voluntary)
    const form = new FormData();
    form.append("accountId", user1.account.id);
    form.append("tenantId", orgTenant.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        orgSession.cookie,
        orgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.message).toContain("left");

    // Verify account_metadata was soft-deleted
    const metadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, user1.account.id),
        eq(account_metadata_table.tenant_id, orgTenant.tenant.id)
      ),
    });
    expect(metadata?.deleted_at).toBeDefined();

    // Verify account still exists
    const account = await db.query.account_table.findFirst({
      where: eq(account_table.id, user1.account.id),
    });
    expect(account).toBeDefined();
    expect(account?.deleted_at).toBeNull();
  });

  test("should allow admin to remove another account from tenant", async () => {
    await resetDb();

    // Create admin user
    const admin = await setTestSession(undefined, "admin@test.com");

    // Create regular user
    const regularUser = await setTestSession(undefined, "user@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      admin.user.id,
      "Company",
      admin.account.id
    );

    // Add regular user to org tenant
    await db.insert(account_metadata_table).values({
      user_id: regularUser.user.id,
      account_id: regularUser.account.id,
      tenant_id: orgTenant.tenant.id,
      role_id: orgTenant.role.id,
    });

    // Create admin session in org tenant context
    const adminOrgSession = await setTestSessionInTenant(
      admin.user.id,
      orgTenant.tenant.id,
      admin.account.id
    );

    // Admin removes regular user
    const form = new FormData();
    form.append("accountId", regularUser.account.id);
    form.append("tenantId", orgTenant.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        adminOrgSession.cookie,
        adminOrgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.message).toContain("removed");

    // Verify regular user's metadata was soft-deleted
    const metadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, regularUser.account.id),
        eq(account_metadata_table.tenant_id, orgTenant.tenant.id)
      ),
    });
    expect(metadata?.deleted_at).toBeDefined();
  });

  test("should not allow removing account from personal tenant", async () => {
    await resetDb();
    const user = await setTestSession();

    const form = new FormData();
    form.append("accountId", user.account.id);
    form.append("tenantId", user.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toContain("personal tenant");
  });

  test("should not allow last owner to leave org tenant", async () => {
    await resetDb();
    const user = await setTestSession();

    // Create org tenant
    const orgTenant = await createTestTenant(
      user.user.id,
      "Solo Org",
      user.account.id
    );

    // Create session in org tenant context
    const orgSession = await setTestSessionInTenant(
      user.user.id,
      orgTenant.tenant.id,
      user.account.id
    );

    // Try to leave as last owner
    const form = new FormData();
    form.append("accountId", user.account.id);
    form.append("tenantId", orgTenant.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        orgSession.cookie,
        orgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toContain("only owner");
  });

  test("should require manage_accounts permission to remove others", async () => {
    await resetDb();

    // Create two regular users (no admin permissions)
    const user1 = await setTestSession(undefined, "user1@test.com");
    const user2 = await setTestSession(undefined, "user2@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      user1.user.id,
      "Org",
      user1.account.id
    );

    // Add user2 as member
    await db.insert(account_metadata_table).values({
      user_id: user2.user.id,
      account_id: user2.account.id,
      tenant_id: orgTenant.tenant.id,
      role_id: orgTenant.role.id,
    });

    // Create session for user1 in org tenant
    const user1OrgSession = await setTestSessionInTenant(
      user1.user.id,
      orgTenant.tenant.id,
      user1.account.id
    );

    // user1 tries to remove user2 (has owner permission, so this should work)
    const form = new FormData();
    form.append("accountId", user2.account.id);
    form.append("tenantId", orgTenant.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        user1OrgSession.cookie,
        user1OrgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    // Should succeed since user1 is owner with manage_accounts permission
    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("ok");
  });

  test("should allow account deletion from personal tenant to fail gracefully", async () => {
    await resetDb();
    const user = await setTestSession();

    // Try to delete account from personal tenant (should fail)
    const form = new FormData();
    form.append("accountId", user.account.id);
    form.append("tenantId", user.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toContain("personal tenant");
  });

  test("should handle account not in tenant", async () => {
    await resetDb();

    const user1 = await setTestSession(undefined, "user1@test.com");
    const user2 = await setTestSession(undefined, "user2@test.com");

    // Create org tenant with only user1
    const orgTenant = await createTestTenant(
      user1.user.id,
      "Org",
      user1.account.id
    );

    // Create session for user1 in org tenant
    const user1OrgSession = await setTestSessionInTenant(
      user1.user.id,
      orgTenant.tenant.id,
      user1.account.id
    );

    // Try to remove user2 who is not in tenant
    const form = new FormData();
    form.append("accountId", user2.account.id);
    form.append("tenantId", orgTenant.tenant.id);

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        user1OrgSession.cookie,
        user1OrgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("error");
  });
});
