import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  account_table,
  SESSION_REMOVE_ACCOUNT_ROUTE,
  SESSION_SWITCH_ACCOUNT_ROUTE,
  type SessionRemoveAccountRouteResponse,
  tenant_table,
} from "@pacetrack/schema";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
  await resetDb();
});

describe("Session Remove Account Route", () => {
  test("removes a non-active account from session", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      account: firstAccount,
    } = await setTestSession();

    // Create a second account for the same user
    const password = "password123";
    const hashedPassword = await Bun.password.hash(password);

    const [secondAccount] = await db
      .insert(account_table)
      .values({
        email: "second@test.com",
        password: hashedPassword,
        user_id: user.id,
      })
      .returning();

    // Create a personal tenant for second account
    const [secondTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Second Personal",
        kind: "personal",
        created_by: user.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: secondAccount.id,
      tenant_id: secondTenant.id,
      role_id: ownerRole!.id,
    });

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: secondAccount.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("Account removed from session");
  });

  test("removes active account and switches to another account", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      account: firstAccount,
    } = await setTestSession();

    // Create a second account for the same user
    const password = "password123";
    const hashedPassword = await Bun.password.hash(password);

    const [secondAccount] = await db
      .insert(account_table)
      .values({
        email: "second@test.com",
        password: hashedPassword,
        user_id: user.id,
      })
      .returning();

    // Create a personal tenant for second account
    const [secondTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Second Personal",
        kind: "personal",
        created_by: user.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: secondAccount.id,
      tenant_id: secondTenant.id,
      role_id: ownerRole!.id,
    });

    // Switch to the second account to add it to the session's active_accounts
    await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: secondAccount.id,
      }),
    });

    // Switch back to first account so we can test removing it
    await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: firstAccount.id,
      }),
    });

    // Remove the currently active account (firstAccount)
    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: firstAccount.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe(
      "Account removed and switched to another account"
    );
  });

  test("logs user out when removing the last account", async () => {
    await resetDb();
    const { cookie, csrfToken, account } = await setTestSession();

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: account.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("Account removed and user logged out");

    // Verify session was invalidated by checking the response
    // (The actual cookie deletion happens via middleware/helper functions)
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();
    const { account } = await setTestSession();

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: account.id,
      }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns 404 when account does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: "non-existent-id",
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account not found");
  });

  test("returns 403 when trying to remove account belonging to different user", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a different user with account
    const password = "password123";
    const hashedPassword = await Bun.password.hash(password);

    const otherSession = await setTestSession(
      undefined,
      "other@test.com",
      password
    );

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: otherSession.account.id,
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You don't have access to this account");
  });

  test("returns 400 when account_id is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_REMOVE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionRemoveAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });
});
