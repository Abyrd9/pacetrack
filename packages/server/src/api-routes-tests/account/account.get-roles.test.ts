import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_GET_ROLES_ROUTE,
  type AccountGetRolesRouteResponse,
  account_metadata_table,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
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

describe("Account Get Roles Route", () => {
  test("returns roles for account with single tenant", async () => {
    await resetDb();
    const { cookie, csrfToken, tenant } = await setTestSession();

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "GET"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGetRolesRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.roles).toBeDefined();

    // Should have one role for the tenant
    const roles = body.payload?.roles;
    if (!roles) throw new Error("Roles not found");
    expect(roles).toBeDefined();
    expect(Object.keys(roles).length).toBe(1);
    expect(roles[tenant.id]).toBeDefined();
    expect(roles[tenant.id].name).toBe("Owner");
  });

  test("returns roles for account with multiple tenants", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      account,
      tenant: firstTenant,
    } = await setTestSession();

    // Create a second tenant
    const [secondTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Second Workspace",
        kind: "org",
        created_by: user.id,
      })
      .returning();

    // Get member role
    const memberRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Member"),
    });

    if (!memberRole) throw new Error("Member role not found");

    // Add account to second tenant with member role
    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: account.id,
      tenant_id: secondTenant.id,
      role_id: memberRole.id,
    });

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "GET"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGetRolesRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.roles).toBeDefined();

    // Should have two roles for two tenants
    const roles = body.payload?.roles;
    if (!roles) throw new Error("Roles not found");
    expect(roles).toBeDefined();
    expect(Object.keys(roles).length).toBe(2);

    // First tenant should have Owner role
    expect(roles[firstTenant.id]).toBeDefined();
    expect(roles[firstTenant.id].name).toBe("Owner");

    // Second tenant should have Member role
    expect(roles[secondTenant.id]).toBeDefined();
    expect(roles[secondTenant.id].name).toBe("Member");
  });

  test("returns empty object when all account metadata is soft-deleted", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    // Soft-delete all account metadata for this account
    await db
      .update(account_metadata_table)
      .set({ deleted_at: new Date() })
      .where(eq(account_metadata_table.account_id, account.id));

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "GET"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGetRolesRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.roles).toBeDefined();

    // Should have no roles
    const roles = body.payload?.roles;
    if (!roles) throw new Error("Roles not found");
    expect(roles).toBeDefined();
    expect(Object.keys(roles).length).toBe(0);
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as AccountGetRolesRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("filters out soft-deleted roles", async () => {
    await resetDb();
    const { cookie, csrfToken, account, tenant } = await setTestSession();

    // Soft delete the role
    const accountMetadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.account_id, account.id),
        eq(account_metadata_table.tenant_id, tenant.id)
      ),
    });

    if (accountMetadata) {
      await db
        .update(role_table)
        .set({ deleted_at: new Date() })
        .where(eq(role_table.id, accountMetadata.role_id));
    }

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "GET"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGetRolesRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.roles).toBeDefined();

    // Should have no roles since the role was soft-deleted
    const roles = body.payload?.roles;
    if (!roles) throw new Error("Roles not found");
    expect(Object.keys(roles).length).toBe(0);
  });

  test("filters out soft-deleted account metadata", async () => {
    await resetDb();
    const { cookie, csrfToken, account, tenant } = await setTestSession();

    // Soft delete the account metadata
    await db
      .update(account_metadata_table)
      .set({ deleted_at: new Date() })
      .where(
        and(
          eq(account_metadata_table.account_id, account.id),
          eq(account_metadata_table.tenant_id, tenant.id)
        )
      );

    const response = await app.request(ACCOUNT_GET_ROLES_ROUTE.path, {
      method: "GET",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "GET"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGetRolesRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.roles).toBeDefined();

    // Should have no roles since the metadata was soft-deleted
    const roles = body.payload?.roles;
    if (!roles) throw new Error("Roles not found");
    expect(Object.keys(roles).length).toBe(0);
  });
});
