import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  account_metadata_table,
  TENANT_GET_ROUTE,
  type Tenant,
  tenant_table,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "../../utils/test-helpers/set-test-session";

beforeAll(async () => {
  await resetDb();
});

beforeEach(() => {
  // Reset all mocks before each test
  mock.restore();
});

describe("Tenant Get Route", () => {
  test("should return 401 if user is not authenticated", async () => {
    const response = await app.request(TENANT_GET_ROUTE.path, {
      method: "GET",
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("Should return only the personal tenant for an initial user", async () => {
    // Create a test user without any tenants
    const { cookie } = await setTestSession();

    const response = await app.request(TENANT_GET_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, ""), // GET requests don't need CSRF token
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.payload.tenants).toHaveLength(1);
    expect(body.payload.tenants[0].name).toBe("Personal");
  });

  test("should return user's tenants", async () => {
    // Create a test user with a tenant
    const { user, account, cookie, tenant, role } = await setTestSession();

    // Create an additional tenant for the user
    const additionalTenant = await db
      .insert(tenant_table)
      .values({
        name: "Additional Tenant",
        created_by: user.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: account.id,
      tenant_id: additionalTenant[0].id,
      role_id: role.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    const response = await app.request(TENANT_GET_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, ""), // GET requests don't need CSRF token
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.payload.tenants).toHaveLength(2);
    expect(body.payload.tenants.map((t: Tenant) => t.name)).toContain(
      "Personal"
    );
    expect(body.payload.tenants.map((t: Tenant) => t.name)).toContain(
      "Additional Tenant"
    );
  });
});
