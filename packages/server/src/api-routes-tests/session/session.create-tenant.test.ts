import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_table,
  SESSION_CREATE_TENANT_ROUTE,
  type SessionCreateTenantRouteResponse,
  user_table,
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

describe("Session Create Tenant Route", () => {
  test("successfully creates a new tenant and switches session to it", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Workspace");
    form.append("account_id", account.id);

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.name).toBe("Test Workspace");
    expect(body.payload?.kind).toBe("org");

    // Verify tenant was created in database
    const tenant = await db.query.tenant_table.findFirst({
      where: (tenants, { eq }) => eq(tenants.name, "Test Workspace"),
    });
    expect(tenant).toBeDefined();
    expect(tenant?.kind).toBe("org");

    if (!tenant) throw new Error("Tenant not created");

    // Verify account_metadata was created
    const accountMetadata = await db.query.account_metadata_table.findFirst({
      where: (am, { eq, and }) =>
        and(eq(am.account_id, account.id), eq(am.tenant_id, tenant.id)),
    });
    expect(accountMetadata).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();
    const { account } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Workspace");
    form.append("account_id", account.id);

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns 404 when account does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Workspace");
    form.append("account_id", "non-existent-account-id");

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.account_id).toBe("Account not found");
  });

  test("returns 404 when trying to create tenant for account belonging to different user", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create account for a different user
    const [otherUser] = await db
      .insert(user_table)
      .values({ created_at: new Date(), updated_at: new Date() })
      .returning();

    const [otherAccount] = await db
      .insert(account_table)
      .values({
        email: "other@test.com",
        password: "hashedpassword",
        user_id: otherUser.id,
      })
      .returning();

    const form = new FormData();
    form.append("name", "Test Workspace");
    form.append("account_id", otherAccount.id);

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.account_id).toBe("Account not found");
  });

  test("returns 400 when required fields are missing", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("account_id", account.id);
    // Missing name

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when image has invalid mime type", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("name", "Test Workspace");
    form.append("account_id", account.id);
    const invalidFile = new File([new Uint8Array([1, 2, 3])], "bad.txt", {
      type: "text/plain",
    });
    form.append("image", invalidFile);

    const response = await app.request(SESSION_CREATE_TENANT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionCreateTenantRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.image).toBeDefined();
  });
});
