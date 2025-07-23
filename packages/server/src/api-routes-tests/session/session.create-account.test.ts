import { beforeAll, describe, expect, test } from "bun:test";
import {
  SESSION_CREATE_ACCOUNT_ROUTE,
  type SessionCreateAccountRouteResponse,
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

describe("Session Create Account Route", () => {
  test("successfully creates a new account and switches session to it", async () => {
    await resetDb();
    const { user, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", "newaccount@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.user.id).toBe(user.id);
    expect(body.payload?.account.email).toBe("newaccount@test.com");
    expect(body.payload?.csrfToken).toBeDefined();
    expect(body.payload?.csrfToken).toBeTypeOf("string");

    // Verify session cookie was set
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders).toBeDefined();
    const sessionCookie = setCookieHeaders.find((c) =>
      c.startsWith("pacetrack-session=")
    );
    expect(sessionCookie).toBeDefined();

    // Verify account was created in database
    const account = await db.query.account_table.findFirst({
      where: (accounts, { eq }) => eq(accounts.email, "newaccount@test.com"),
    });
    expect(account).toBeDefined();
    expect(account?.user_id).toBe(user.id);

    // Verify tenant was created
    const tenant = await db.query.tenant_table.findFirst({
      where: (tenants, { eq, and }) =>
        and(eq(tenants.created_by, user.id), eq(tenants.kind, "personal")),
      orderBy: (tenants, { desc }) => [desc(tenants.created_at)],
    });
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe("Personal");

    // Verify account_metadata was created
    const accountMetadata = await db.query.account_metadata_table.findFirst({
      where: (am, { eq, and }) =>
        and(eq(am.account_id, account!.id), eq(am.tenant_id, tenant!.id)),
    });
    expect(accountMetadata).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();
    const { user } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", "newaccount@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns 403 when trying to create account for different user", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", "different-user-id");
    form.append("email", "newaccount@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns 409 when email already exists", async () => {
    await resetDb();
    const { user, cookie, csrfToken, account } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", account.email);
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBe(
      "An account with this email already exists"
    );
  });

  test("returns 400 when required fields are missing", async () => {
    await resetDb();
    const { user, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    // Missing email, password, and passwordConfirmation

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when passwords don't match", async () => {
    await resetDb();
    const { user, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", "newaccount@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "differentpassword");

    const response = await app.request(SESSION_CREATE_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionCreateAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });
});
