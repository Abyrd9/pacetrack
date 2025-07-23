import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  TENANT_CREATE_ROUTE,
  type TenantCreateRouteResponse,
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

beforeEach(() => {
  mock.restore();
});

describe("Admin Tenant Create Route", () => {
  test("should return 400 if name is not provided", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("account_id", account.id);

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.name).toBeDefined();
  });

  test("should return 400 if account_id is not provided", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Tenant");

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.account_id).toBeDefined();
  });

  test("should return 400 if image provided has invalid mime type", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Tenant");
    form.append("account_id", account.id);
    const bad = new File([new Uint8Array([1, 2, 3])], "bad.txt", {
      type: "text/plain",
    });
    form.append("image", bad);

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantCreateRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.image).toBeDefined();
  });

  test("should create tenant successfully", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Tenant");
    form.append("account_id", account.id);

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantCreateRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.name).toBe("Test Tenant");
    // no direct image_url support; only file upload optional

    // Verify tenant was created in database
    const tenant = await db.query.tenant_table.findFirst({
      where: (tenants, { eq }) => eq(tenants.name, "Test Tenant"),
    });
    expect(tenant).toBeDefined();
  });

  test("should handle JSON request body", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        name: "Test Tenant",
        account_id: account.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantCreateRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.name).toBe("Test Tenant");
  });

  test("should return 403 if CSRF token is missing", async () => {
    await resetDb();
    const { account, cookie } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Tenant");
    form.append("account_id", account.id);

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "http://localhost:3000", // Add origin header to simulate browser request
        // No CSRF token
      },
      body: form,
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.errors.global).toBe("CSRF token required");
  });

  test("should return 403 if CSRF token is invalid", async () => {
    await resetDb();
    const { account, cookie } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Tenant");
    form.append("account_id", account.id);

    const response = await app.request(TENANT_CREATE_ROUTE.path, {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "http://localhost:3000", // Add origin header to simulate browser request
        "x-csrf-token": "invalid-csrf-token",
      },
      body: form,
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.errors.global).toBe("Invalid CSRF token");
  });
});
