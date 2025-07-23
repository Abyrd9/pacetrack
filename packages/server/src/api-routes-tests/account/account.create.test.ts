import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_CREATE_ROUTE,
  type AccountCreateRouteResponse,
} from "@pacetrack/schema";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

let cookie: string | undefined;
let csrfToken: string | undefined;

beforeAll(async () => {
  await resetDb();
  const session = await setTestSession();
  cookie = session.cookie;
  csrfToken = session.csrfToken;
});

describe("Account Create Route", () => {
  test("should create a new account for existing user", async () => {
    await resetDb();
    const { user, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", "newaccount@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.user.id).toBe(user.id);
    expect(body.payload?.account.email).toBe("newaccount@test.com");

    // Verify account was created in database
    const account = await db.query.account_table.findFirst({
      where: (accounts, { eq }) => eq(accounts.email, "newaccount@test.com"),
    });
    expect(account).toBeDefined();
    expect(account?.user_id).toBe(user.id);

    // Verify tenant was created
    const tenant = await db.query.tenant_table.findFirst({
      where: (tenants, { eq }) =>
        eq(tenants.created_by, user.id) && eq(tenants.kind, "personal"),
    });
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe("Personal");

    // Verify account_to_tenant relationship
    const accountToTenant = await db.query.account_metadata_table.findFirst({
      where: (att, { eq }) =>
        eq(att.account_id, account!.id) && eq(att.tenant_id, tenant!.id),
    });
    expect(accountToTenant).toBeDefined();
  });

  test("should return 400 if user_id is not provided", async () => {
    const form = new FormData();
    form.append("email", "test@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie!, csrfToken!, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.user_id).toBeDefined();
  });

  test("should return 404 if user does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("user_id", "nonexistent-user-id");
    form.append("email", "test@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.global).toBe("User not found");
  });

  test("should return 404 if user_id does not match current session user", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create another user
    const { user: otherUser } = await setTestSession(
      undefined,
      "other@test.com"
    );

    const form = new FormData();
    form.append("user_id", otherUser.id); // Different user ID
    form.append("email", "test@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "password123");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("should return 409 if email already exists", async () => {
    await resetDb();
    // Create first user and account
    const session1 = await setTestSession();
    const { user: user1 } = session1;

    // Create an account for user1
    const form1 = new FormData();
    form1.append("user_id", user1.id);
    form1.append("email", "test@test.com");
    form1.append("password", "password123");
    form1.append("passwordConfirmation", "password123");

    await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        session1.cookie,
        session1.csrfToken,
        "POST"
      ),
      body: form1,
    });

    // Create second user
    const session2 = await setTestSession(undefined, "other@test.com");
    const { user: user2 } = session2;

    // Try to create another account with the same email for user2
    const form2 = new FormData();
    form2.append("user_id", user2.id);
    form2.append("email", "test@test.com"); // Same email as user1's account
    form2.append("password", "password456");
    form2.append("passwordConfirmation", "password456");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        session2.cookie,
        session2.csrfToken,
        "POST"
      ),
      body: form2,
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.email).toBe(
      "An account with this email already exists"
    );
  });

  test("should return 400 if passwords don't match", async () => {
    await resetDb();
    const { user } = await setTestSession();

    const form = new FormData();
    form.append("user_id", user.id);
    form.append("email", "test@test.com");
    form.append("password", "password123");
    form.append("passwordConfirmation", "differentpassword");

    const response = await app.request(ACCOUNT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie!, csrfToken!, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.passwordConfirmation).toBe("Passwords do not match");
  });
});
