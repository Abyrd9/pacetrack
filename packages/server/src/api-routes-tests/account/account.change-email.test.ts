import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_CHANGE_EMAIL_ROUTE,
  type ChangeEmailRouteResponse,
} from "@pacetrack/schema";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
  await resetDb();
});

describe("Account Change Email Route", () => {
  test("returns 401 when unauthenticated (CSRF token required)", async () => {
    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
    });

    expect(response.status).toBe(401);
  });

  test("returns 400 when email not provided", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();

    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ChangeEmailRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("returns 400 when email is invalid", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("email", "invalid-email");

    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ChangeEmailRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("returns 400 when new email is same as current", async () => {
    await resetDb();
    const { cookie, csrfToken, account } = await setTestSession();

    const form = new FormData();
    form.append("email", account.email);

    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ChangeEmailRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("returns 400 when email already taken", async () => {
    await resetDb();
    const { cookie, csrfToken, tenant } = await setTestSession();
    const { account: existingAccount } = await createTestAccount({
      tenantId: tenant.id,
      email: "existing@test.com",
    });

    const form = new FormData();
    form.append("email", existingAccount.email);

    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ChangeEmailRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("successfully initiates email change and sends confirmation", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("email", "newemail@test.com");

    const response = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ChangeEmailRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.email).toBe("newemail@test.com");
  });
});
