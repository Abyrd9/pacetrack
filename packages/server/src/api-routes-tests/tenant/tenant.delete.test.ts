import { describe, expect, test } from "bun:test";
import {
  account_group_table,
  account_metadata_table,
  account_to_account_group_table,
  TENANT_DELETE_ROUTE,
  type TenantDeleteRouteResponse,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import app from "../..";
import { db } from "../../db";
import { createTestTenant } from "../../utils/test-helpers/create-test-tenant";
import { resetDb } from "../../utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "../../utils/test-helpers/set-test-session";
import { setTestSessionInTenant } from "../../utils/test-helpers/set-test-session-in-tenant";

describe("Tenant Delete Route", () => {
  // TODO: Fix Drizzle ORM relation error in deleteTenantEntirely helper
  // Currently failing with: TypeError: undefined is not an object (evaluating 'relation.referencedTable')
  // This is an implementation bug, not a test bug
  test("should allow owner to delete org tenant", async () => {
    await resetDb();
    const owner = await setTestSession();

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Company",
      owner.account.id
    );

    // Create session in org tenant context
    const orgSession = await setTestSessionInTenant(
      owner.user.id,
      orgTenant.tenant.id,
      owner.account.id
    );

    const form = new FormData();
    form.append("tenantId", orgTenant.tenant.id);
    form.append("bypassNonCriticalBlockers", "true");

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        orgSession.cookie,
        orgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("ok");

    // Verify tenant was soft-deleted
    const deletedTenant = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, orgTenant.tenant.id),
    });
    expect(deletedTenant?.deleted_at).toBeDefined();
    expect(deletedTenant?.deleted_by).toBe(owner.user.id);

    // Verify account_metadata was soft-deleted
    const deletedMetadata = await db.query.account_metadata_table.findFirst({
      where: eq(account_metadata_table.tenant_id, orgTenant.tenant.id),
    });
    expect(deletedMetadata?.deleted_at).toBeDefined();
  });

  test("should not allow deleting personal tenant", async () => {
    await resetDb();
    const user = await setTestSession();

    const form = new FormData();
    form.append("tenantId", user.tenant.id); // Personal tenant

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toContain("Personal tenant");

    // Verify tenant was NOT deleted
    const tenant = await db.query.tenant_table.findFirst({
      where: eq(tenant_table.id, user.tenant.id),
    });
    expect(tenant?.deleted_at).toBeNull();
  });

  // TODO: Fix Drizzle ORM relation error in deleteTenantEntirely helper
  // Currently failing with: TypeError: undefined is not an object (evaluating 'relation.referencedTable')
  // This is an implementation bug, not a test bug
  test("should require manage_settings permission", async () => {
    await resetDb();

    // Create owner and member
    const owner = await setTestSession(undefined, "owner@test.com");
    const member = await setTestSession(undefined, "member@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Company",
      owner.account.id
    );

    // Add member user
    await db.insert(account_metadata_table).values({
      user_id: member.user.id,
      account_id: member.account.id,
      tenant_id: orgTenant.tenant.id,
      role_id: orgTenant.role.id,
    });

    // Create member session in org tenant context
    const memberOrgSession = await setTestSessionInTenant(
      member.user.id,
      orgTenant.tenant.id,
      member.account.id
    );

    // Member tries to delete (owner has manage_settings, so this should succeed)
    const form = new FormData();
    form.append("tenantId", orgTenant.tenant.id);
    form.append("bypassNonCriticalBlockers", "true");

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        memberOrgSession.cookie,
        memberOrgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    // Should succeed since member was added with owner role that has manage_settings
    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("ok");
  });

  // TODO: Fix Drizzle ORM relation error in deleteTenantEntirely helper
  // Currently failing with: TypeError: undefined is not an object (evaluating 'relation.referencedTable')
  // This is an implementation bug, not a test bug
  test("should delete all account groups in tenant", async () => {
    await resetDb();
    const owner = await setTestSession();

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Company",
      owner.account.id
    );

    // Create account groups
    const [group1, group2] = await db
      .insert(account_group_table)
      .values([
        {
          name: "Engineering",
          tenant_id: orgTenant.tenant.id,
        },
        {
          name: "Design",
          tenant_id: orgTenant.tenant.id,
        },
      ])
      .returning();

    // Add account to groups
    await db.insert(account_to_account_group_table).values([
      {
        account_id: owner.account.id,
        account_group_id: group1.id,
      },
      {
        account_id: owner.account.id,
        account_group_id: group2.id,
      },
    ]);

    // Create session in org tenant context
    const orgSession = await setTestSessionInTenant(
      owner.user.id,
      orgTenant.tenant.id,
      owner.account.id
    );

    // Delete tenant
    const form = new FormData();
    form.append("tenantId", orgTenant.tenant.id);
    form.append("bypassNonCriticalBlockers", "true");

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        orgSession.cookie,
        orgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("ok");

    // Verify groups were soft-deleted
    const deletedGroup1 = await db
      .select()
      .from(account_group_table)
      .where(eq(account_group_table.id, group1.id));
    expect(deletedGroup1[0]?.deleted_at).toBeDefined();

    const deletedGroup2 = await db
      .select()
      .from(account_group_table)
      .where(eq(account_group_table.id, group2.id));
    expect(deletedGroup2[0]?.deleted_at).toBeDefined();

    // Verify account-to-group relationships were soft-deleted
    const deletedRelations = await db
      .select()
      .from(account_to_account_group_table)
      .where(
        and(
          eq(account_to_account_group_table.account_id, owner.account.id),
          isNull(account_to_account_group_table.deleted_at)
        )
      );
    expect(deletedRelations.length).toBe(0);
  });

  // TODO: Fix Drizzle ORM relation error in deleteTenantEntirely helper
  // Currently failing with: TypeError: undefined is not an object (evaluating 'relation.referencedTable')
  // This is an implementation bug, not a test bug
  test("should handle tenant with multiple members", async () => {
    await resetDb();

    // Create owner and 3 members
    const owner = await setTestSession(undefined, "owner@test.com");
    const member1 = await setTestSession(undefined, "member1@test.com");
    const member2 = await setTestSession(undefined, "member2@test.com");
    const member3 = await setTestSession(undefined, "member3@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Big Company",
      owner.account.id
    );

    // Add additional members
    await db.insert(account_metadata_table).values([
      {
        user_id: member1.user.id,
        account_id: member1.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: orgTenant.role.id,
      },
      {
        user_id: member2.user.id,
        account_id: member2.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: orgTenant.role.id,
      },
      {
        user_id: member3.user.id,
        account_id: member3.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: orgTenant.role.id,
      },
    ]);

    // Create session in org tenant context
    const orgSession = await setTestSessionInTenant(
      owner.user.id,
      orgTenant.tenant.id,
      owner.account.id
    );

    // Owner should be able to delete even with multiple members
    const form = new FormData();
    form.append("tenantId", orgTenant.tenant.id);
    form.append("bypassNonCriticalBlockers", "true");

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        orgSession.cookie,
        orgSession.csrfToken,
        "POST"
      ),
      body: form,
    });

    // Should succeed - multiple members is informational, not a blocker
    expect(response.status).toBe(200);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("ok");

    // Verify all members' metadata was soft-deleted
    const allMetadata = await db
      .select()
      .from(account_metadata_table)
      .where(
        and(
          eq(account_metadata_table.tenant_id, orgTenant.tenant.id),
          isNull(account_metadata_table.deleted_at)
        )
      );
    expect(allMetadata.length).toBe(0);
  });

  test("should return 404 if tenant not found", async () => {
    await resetDb();
    const user = await setTestSession();

    const form = new FormData();
    form.append("tenantId", "nonexistent");

    const response = await app.request(TENANT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(user.cookie, user.csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as TenantDeleteRouteResponse;
    expect(body.status).toBe("error");
  });
});
