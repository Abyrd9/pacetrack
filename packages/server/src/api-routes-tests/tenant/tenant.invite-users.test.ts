import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  membership_table,
  TENANT_INVITE_USERS_ROUTE,
  type TenantInviteUsersRouteResponse,
  tenant_table,
  user_invites_table,
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

describe("Tenant Invite Users Route", () => {
  test("successfully invites users to a tenant", async () => {
    await resetDb();
    const { user, account, cookie, csrfToken } = await setTestSession();

    // Create an org tenant (not personal)
    const [membership] = await db
      .insert(membership_table)
      .values({ created_by: user.id })
      .returning();

    const [orgTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Test Organization",
        kind: "org",
        membership_id: membership.id,
        created_by: user.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    if (!ownerRole) throw new Error("Owner role not found");

    // Add account to org tenant with owner role
    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: account.id,
      tenant_id: orgTenant.id,
      role_id: ownerRole.id,
    });

    const response = await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: orgTenant.id,
        emails: ["user1@test.com", "user2@test.com"],
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantInviteUsersRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("Users invited successfully");

    // Verify invites were created in database
    const invites = await db.query.user_invites_table.findMany({
      where: eq(user_invites_table.tenant_id, orgTenant.id),
    });

    expect(invites.length).toBe(2);
    expect(invites.map((i) => i.email)).toContain("user1@test.com");
    expect(invites.map((i) => i.email)).toContain("user2@test.com");
  });

  test("returns 400 when trying to invite to personal tenant", async () => {
    await resetDb();
    const { tenant, cookie, csrfToken } = await setTestSession();

    const response = await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: tenant.id,
        emails: ["user@test.com"],
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantInviteUsersRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe(
      "You cannot invite users to a personal tenant"
    );
  });

  test("returns 403 when user lacks manage_users permission", async () => {
    await resetDb();
    const { user, cookie, csrfToken } = await setTestSession();

    // Create an org tenant
    const [membership] = await db
      .insert(membership_table)
      .values({ created_by: user.id })
      .returning();

    const [orgTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Test Organization",
        kind: "org",
        membership_id: membership.id,
        created_by: user.id,
      })
      .returning();

    // Create another user/account with Member role (no manage_users)
    const { account: memberAccount } = await setTestSession(
      undefined,
      "member@test.com",
      "password"
    );

    // Get member role
    const memberRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Member"),
    });

    if (!memberRole) throw new Error("Member role not found");

    // Add member account to org tenant
    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: memberAccount.id,
      tenant_id: orgTenant.id,
      role_id: memberRole.id,
    });

    // Try to invite with the first session (which doesn't have access to this tenant)
    const response = await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: orgTenant.id,
        emails: ["newuser@test.com"],
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as TenantInviteUsersRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized to invite users");
  });

  test("returns 400 when tenant does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: "non-existent-tenant",
        emails: ["user@test.com"],
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantInviteUsersRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Tenant not found");
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    const response = await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: tenant.id,
        emails: ["user@test.com"],
      }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as TenantInviteUsersRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("updates existing invite when inviting same email again", async () => {
    await resetDb();
    const { user, account, cookie, csrfToken } = await setTestSession();

    // Create an org tenant
    const [membership] = await db
      .insert(membership_table)
      .values({ created_by: user.id })
      .returning();

    const [orgTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Test Organization",
        kind: "org",
        membership_id: membership.id,
        created_by: user.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    if (!ownerRole) throw new Error("Owner role not found");

    // Add account to org tenant
    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: account.id,
      tenant_id: orgTenant.id,
      role_id: ownerRole.id,
    });

    // First invite
    await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: orgTenant.id,
        emails: ["user@test.com"],
      }),
    });

    const firstInvite = await db.query.user_invites_table.findFirst({
      where: and(
        eq(user_invites_table.email, "user@test.com"),
        eq(user_invites_table.tenant_id, orgTenant.id)
      ),
    });

    expect(firstInvite).toBeDefined();
    const firstCode = firstInvite?.code;

    // Second invite to same email
    await app.request(TENANT_INVITE_USERS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        tenantId: orgTenant.id,
        emails: ["user@test.com"],
      }),
    });

    const secondInvite = await db.query.user_invites_table.findFirst({
      where: and(
        eq(user_invites_table.email, "user@test.com"),
        eq(user_invites_table.tenant_id, orgTenant.id)
      ),
    });

    expect(secondInvite).toBeDefined();
    expect(secondInvite?.code).not.toBe(firstCode); // Code should be regenerated

    // Should still be only one invite
    const allInvites = await db.query.user_invites_table.findMany({
      where: eq(user_invites_table.tenant_id, orgTenant.id),
    });
    expect(allInvites.length).toBe(1);
  });
});
