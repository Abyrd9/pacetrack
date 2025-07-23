import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_table,
  account_to_tenant_table,
  SESSION_SWITCH_ACCOUNT_ROUTE,
  type SessionSwitchAccountRouteResponse,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
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

describe("Session Switch Account Route", () => {
  test("successfully switches to another account for the same user", async () => {
    await resetDb();
    const { cookie, csrfToken, user, tenant } = await setTestSession();

    // Create a second account for the same user
    const { account: secondAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "second@test.com",
      existingUserId: user.id,
    });

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: secondAccount.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("ACCOUNT switched successfully");
  });

  test("returns 404 when account does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: "non-existent-account-id",
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("ACCOUNT not found");
  });

  test("returns 403 when trying to switch to account belonging to different user", async () => {
    await resetDb();
    const { cookie, csrfToken, tenant } = await setTestSession();

    // Create an account for a different user
    const { account: otherAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "other@test.com",
    });

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: otherAccount.id,
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You don't have access to this account");
  });

  test("returns 403 when account is not linked to any tenant", async () => {
    await resetDb();
    const { cookie, csrfToken, user } = await setTestSession();

    // Create an account for the same user but not linked to any tenant
    const [accountWithoutTenant] = await db
      .insert(account_table)
      .values({
        email: "notenant@test.com",
        user_id: user.id,
        password: "password",
      })
      .returning();

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: accountWithoutTenant.id,
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe(
      "You don't have access to this organization"
    );
  });

  test("returns 400 when account_id is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when account_id is empty string", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: "",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 401 when no session token is provided", async () => {
    await resetDb();

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: "some-account-id",
      }),
    });

    expect(response.status).toBe(401);
  });

  test("can switch between multiple accounts for the same user", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      tenant,
      account: firstAccount,
    } = await setTestSession();

    // Create a second account for the same user
    const { account: secondAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "second@test.com",
      existingUserId: user.id,
    });

    // Create a third account for the same user
    const { account: thirdAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "third@test.com",
      existingUserId: user.id,
    });

    // Switch to second account
    const response1 = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: secondAccount.id,
      }),
    });

    expect(response1.status).toBe(200);
    const body1 = (await response1.json()) as SessionSwitchAccountRouteResponse;
    expect(body1.status).toBe("ok");

    // Switch to third account
    const response2 = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: thirdAccount.id,
      }),
    });

    expect(response2.status).toBe(200);
    const body2 = (await response2.json()) as SessionSwitchAccountRouteResponse;
    expect(body2.status).toBe("ok");

    // Switch back to first account
    const response3 = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: firstAccount.id,
      }),
    });

    expect(response3.status).toBe(200);
    const body3 = (await response3.json()) as SessionSwitchAccountRouteResponse;
    expect(body3.status).toBe("ok");
  });

  test("returns 403 when tenant is soft-deleted", async () => {
    await resetDb();
    const { cookie, csrfToken, user, tenant } = await setTestSession();

    // Create a second account for the same user
    const { account: secondAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "second@test.com",
      existingUserId: user.id,
    });

    // Soft delete the tenant
    await db
      .update(account_to_tenant_table)
      .set({ deleted_at: new Date() })
      .where(eq(account_to_tenant_table.account_id, secondAccount.id));

    const response = await app.request(SESSION_SWITCH_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        account_id: secondAccount.id,
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as SessionSwitchAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe(
      "You don't have access to this organization"
    );
  });
});
