import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { TENANT_GET_BY_ID_ROUTE } from "@pacetrack/schema";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
  await resetDb();
});

beforeEach(() => {
  mock.restore();
});

describe("Tenant Get By ID Route", () => {
  test("should return 401 if user is not authenticated (CSRF token required)", async () => {
    const response = await app.request(TENANT_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: "some-tenant-id",
      }),
    });

    expect(response.status).toBe(401);
  });

  test("should return 400 if tenantId is not provided", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(TENANT_GET_BY_ID_ROUTE.path, {
      method: "POST",
      body: JSON.stringify({}),
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.tenantId).toBeDefined();
  });

  test("should return 404 if tenant is not found", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(TENANT_GET_BY_ID_ROUTE.path, {
      method: "POST",
      body: JSON.stringify({ tenantId: "non-existent-id" }),
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.global).toBe("Tenant not found or access denied");
  });

  test("should return tenant when found", async () => {
    const { cookie, csrfToken, tenant } = await setTestSession();

    const response = await app.request(TENANT_GET_BY_ID_ROUTE.path, {
      method: "POST",
      body: JSON.stringify({ tenantId: tenant.id }),
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.payload.id).toBe(tenant.id);
    expect(body.payload.name).toBe(tenant.name);
  });

  test("should work with form data", async () => {
    const { cookie, csrfToken, tenant } = await setTestSession();

    const form = new FormData();
    form.append("tenantId", tenant.id);

    const response = await app.request(TENANT_GET_BY_ID_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.payload.id).toBe(tenant.id);
    expect(body.payload.name).toBe(tenant.name);
  });
});
