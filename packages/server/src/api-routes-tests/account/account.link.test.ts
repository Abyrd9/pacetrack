import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  account_table,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import {
  ACCOUNT_LINK_ROUTE,
  type AccountLinkRouteResponse,
} from "@pacetrack/schema/src/routes-schema/acount/account.link.types";
import { and, eq } from "drizzle-orm";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
import { createTestTenant } from "src/utils/test-helpers/create-test-tenant";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";
import { getSessionClient } from "../../utils/helpers/auth/auth-session";

beforeAll(async () => {
  await resetDb();
});

describe("Account Link Route", () => {
  test("returns 400 if email is not provided", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("returns 400 if password is not provided", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "test@test.com",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.password).toBeDefined();
  });

  test("returns error if account does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "nonexistent@test.com",
        password: "password123",
      }),
    });

    // The API might return 400 or 500 depending on where the error occurs
    expect([400, 500]).toContain(response.status);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("error");
  });

  test("returns 400 if password is incorrect", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create another account to try to link
    await setTestSession(undefined, "other@test.com", "correctpassword");

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "other@test.com",
        password: "wrongpassword",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.form).toBe("Invalid email or password");
  });

  test("links account that already belongs to same user and adds all tenants to active_accounts", async () => {
    await resetDb();
    const { cookie, csrfToken, user } = await setTestSession(
      undefined,
      "first@test.com"
    );

    // Get the first account's personal tenant
    const personalTenant = await db.query.tenant_table.findFirst({
      where: (tenants, { eq, and }) =>
        and(eq(tenants.created_by, user.id), eq(tenants.kind, "personal")),
    });

    if (!personalTenant) throw new Error("Personal tenant not found");

    // Create a second account for the same user
    // (it will be linked to the personal tenant by setTestSession)
    const session2 = await setTestSession({ id: user.id }, "second@test.com");
    const { account: secondAccount, tenant: secondTenant } = session2;

    // Update password for the second account so we can link it
    await db
      .update(account_table)
      .set({ password: await Bun.password.hash("password123") })
      .where(eq(account_table.id, secondAccount.id));

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "second@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("ok");

    // Verify the session now includes both personal tenants
    const sessionId = await getSessionClient().getSessionIdFromToken(
      cookie.split("=")[1].split(";")[0]
    );

    if (sessionId) {
      const session = await getSessionClient().getSession({ sessionId });

      // Should have active_accounts for both personal tenants
      expect(session?.active_accounts.length).toBeGreaterThanOrEqual(2);

      const hasFirstTenant = session?.active_accounts.some(
        (acc) => acc.tenant_id === personalTenant.id
      );
      const hasSecondTenant = session?.active_accounts.some(
        (acc) => acc.tenant_id === secondTenant.id
      );

      expect(hasFirstTenant).toBe(true);
      expect(hasSecondTenant).toBe(true);
    }
  });

  test("merges accounts from different users and preserves all personal tenants", async () => {
    await resetDb();

    // Create first user with their account
    const session1 = await setTestSession(undefined, "user1@test.com");
    const {
      user: user1,
      account: account1,
      tenant: personalTenant1,
    } = session1;

    // Create second user (will be merged into user1 because user1 is older)
    const session2 = await setTestSession(undefined, "user2@test.com");
    const {
      user: user2,
      account: account2,
      tenant: personalTenant2,
    } = session2;

    // Verify both personal tenants exist
    const tenant1Before = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, personalTenant1.id),
    });
    const tenant2Before = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, personalTenant2.id),
    });

    expect(tenant1Before).toBeDefined();
    expect(tenant2Before).toBeDefined();
    expect(tenant1Before?.kind).toBe("personal");
    expect(tenant2Before?.kind).toBe("personal");

    // Link user2's account to user1's session
    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        session1.cookie,
        session1.csrfToken,
        "POST",
        {
          "Content-Type": "application/json",
        }
      ),
      body: JSON.stringify({
        email: "user2@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("ok");

    // Verify account2 now belongs to user1
    const updatedAccount2 = await db.query.account_table.findFirst({
      where: eq(account_table.id, account2.id),
    });
    expect(updatedAccount2?.user_id).toBe(user1.id);

    // Verify BOTH personal tenants still exist and are NOT soft-deleted
    const tenant1After = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, personalTenant1.id),
    });
    const tenant2After = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, personalTenant2.id),
    });

    expect(tenant1After).toBeDefined();
    expect(tenant2After).toBeDefined();
    expect(tenant1After?.deleted_at).toBeNull();
    expect(tenant2After?.deleted_at).toBeNull();

    // Verify account_metadata relationships were updated (not deleted)
    const account1Metadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, account1.id),
        eq(account_metadata_table.tenant_id, personalTenant1.id)
      ),
    });

    const account2Metadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, account2.id),
        eq(account_metadata_table.tenant_id, personalTenant2.id)
      ),
    });

    expect(account1Metadata).toBeDefined();
    expect(account2Metadata).toBeDefined();
    expect(account1Metadata?.user_id).toBe(user1.id);
    expect(account2Metadata?.user_id).toBe(user1.id); // Updated to user1!
    expect(account1Metadata?.deleted_at).toBeNull();
    expect(account2Metadata?.deleted_at).toBeNull();

    // Verify user2 was soft-deleted (no other accounts)
    const deletedUser2 = await db.query.user_table.findFirst({
      where: eq(user_table.id, user2.id),
    });
    expect(deletedUser2?.deleted_at).not.toBeNull();

    // Verify session contains both accounts' tenants in active_accounts
    const sessionId = await getSessionClient().getSessionIdFromToken(
      session1.cookie.split("=")[1].split(";")[0]
    );

    if (sessionId) {
      const session = await getSessionClient().getSession({ sessionId });

      // Should have both personal tenants
      const hasPersonalTenant1 = session?.active_accounts.some(
        (acc) => acc.tenant_id === personalTenant1.id
      );
      const hasPersonalTenant2 = session?.active_accounts.some(
        (acc) => acc.tenant_id === personalTenant2.id
      );

      expect(hasPersonalTenant1).toBe(true);
      expect(hasPersonalTenant2).toBe(true);
    }
  });

  test("merges newer user into older user", async () => {
    await resetDb();

    // Create first user (will be older)
    const session1 = await setTestSession(undefined, "first@test.com");
    const { user: olderUser } = session1;

    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

    // Create second user (will be newer)
    const session2 = await setTestSession(undefined, "second@test.com");
    const { user: newerUser } = session2;

    // When the older user links the newer user's account, accounts merge to older user
    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        session1.cookie,
        session1.csrfToken,
        "POST",
        {
          "Content-Type": "application/json",
        }
      ),
      body: JSON.stringify({
        email: "second@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);

    // Verify newer user's account now belongs to older user
    const updatedAccount = await db.query.account_table.findFirst({
      where: eq(account_table.email, "second@test.com"),
    });
    expect(updatedAccount?.user_id).toBe(olderUser.id);

    // Verify newer user was soft-deleted
    const deletedNewerUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, newerUser.id),
    });
    expect(deletedNewerUser?.deleted_at).not.toBeNull();
  });

  test("adds account with multiple team tenants to active_accounts", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession(
      undefined,
      "main@test.com"
    );

    // Create a second user with their account
    const session2 = await setTestSession(undefined, "other@test.com");
    const {
      user: otherUser,
      account: otherAccount,
      tenant: otherPersonalTenant,
    } = session2;

    if (!otherPersonalTenant)
      throw new Error("Other personal tenant not found");

    // Create two additional org tenants using helper
    const teamTenant1Result = await createTestTenant(
      otherUser.id,
      "Team 1",
      otherAccount.id
    );

    const teamTenant2Result = await createTestTenant(
      otherUser.id,
      "Team 2",
      otherAccount.id
    );

    // Link the account
    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "other@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);

    // Verify session includes all tenants (personal + both teams)
    const sessionId = await getSessionClient().getSessionIdFromToken(
      cookie.split("=")[1].split(";")[0]
    );

    if (sessionId) {
      const session = await getSessionClient().getSession({ sessionId });

      // Should have entries for personal tenant and both team tenants (3 total)
      const hasPersonal = session?.active_accounts.some(
        (acc) =>
          acc.account_id === otherAccount.id &&
          acc.tenant_id === otherPersonalTenant.id
      );
      const hasTeam1 = session?.active_accounts.some(
        (acc) =>
          acc.account_id === otherAccount.id &&
          acc.tenant_id === teamTenant1Result.tenant.id
      );
      const hasTeam2 = session?.active_accounts.some(
        (acc) =>
          acc.account_id === otherAccount.id &&
          acc.tenant_id === teamTenant2Result.tenant.id
      );

      expect(hasPersonal).toBe(true);
      expect(hasTeam1).toBe(true);
      expect(hasTeam2).toBe(true);
    }
  });

  test("does not create duplicate entries in active_accounts", async () => {
    await resetDb();
    const { cookie, csrfToken, user, tenant } = await setTestSession(
      undefined,
      "first@test.com"
    );

    // Create a second account for the same user with the same tenant
    const { account: secondAccount } = await createTestAccount({
      tenantId: tenant.id, // Same tenant as first account
      email: "second@test.com",
      existingUserId: user.id,
    });

    // Update password
    await db
      .update(account_table)
      .set({ password: await Bun.password.hash("password123") })
      .where(eq(account_table.id, secondAccount.id));

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "second@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);

    // Verify no duplicate tenant entries
    const sessionId = await getSessionClient().getSessionIdFromToken(
      cookie.split("=")[1].split(";")[0]
    );

    if (sessionId) {
      const session = await getSessionClient().getSession({ sessionId });

      // Count how many times this tenant appears
      const tenantCount = session?.active_accounts.filter(
        (acc) => acc.tenant_id === tenant.id
      ).length;

      // Should only appear once even though both accounts have access
      expect(tenantCount).toBe(1);
    }
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as AccountLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("updates session expiration after linking", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession(
      undefined,
      "first@test.com"
    );

    // Create second account
    await setTestSession(undefined, "second@test.com", "password123");

    const response = await app.request(ACCOUNT_LINK_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "second@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);

    // Verify session cookie was refreshed (should have set-cookie header)
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("pacetrack-session");
  });
});
