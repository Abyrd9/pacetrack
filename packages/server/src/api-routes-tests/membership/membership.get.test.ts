import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_to_tenant_table,
  DEFAULT_ROLES,
  MEMBERSHIP_GET_ROUTE,
  type MembershipGetRouteResponse,
  membership_table,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { setTestSession } from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
  await resetDb();
});

describe("Membership Get Route", () => {
  test("returns 401 when not authenticated", async () => {
    const response = await app.request(MEMBERSHIP_GET_ROUTE.path, {
      method: "GET",
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns all unique memberships linked to the user (deduped)", async () => {
    // Create initial session and personal tenant/membership
    const session = await setTestSession();
    const { user, account, cookie, membership } = session;

    // Add a second tenant under the SAME membership
    const [role] = await db
      .insert(role_table)
      .values({
        name: "Manager",
        kind: "tenant_admin",
        allowed: DEFAULT_ROLES.TENANT_ADMIN.allowed,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    const [tenant2] = await db
      .insert(tenant_table)
      .values({
        name: "Second Tenant",
        membership_id: membership.id,
        created_by: user.id,
        kind: "org",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db.insert(account_to_tenant_table).values({
      account_id: account.id,
      tenant_id: tenant2.id,
      role_id: role.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    // Create a completely separate membership + tenant and link user
    const [membership2] = await db
      .insert(membership_table)
      .values({
        created_by: user.id,
        customer_id: "cus_new",
        subscription_id: "sub_new",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    const [tenant3] = await db
      .insert(tenant_table)
      .values({
        name: "Third Tenant",
        membership_id: membership2.id,
        created_by: user.id,
        kind: "org",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db.insert(account_to_tenant_table).values({
      account_id: account.id,
      tenant_id: tenant3.id,
      role_id: role.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    // Now request membership list
    const response = await app.request(MEMBERSHIP_GET_ROUTE.path, {
      method: "GET",
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as MembershipGetRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("Unexpected error");

    // Should contain exactly 2 memberships (deduped)
    expect(body.payload.memberships).toHaveLength(2);
    const membershipIds = body.payload.memberships.map((a) => a.id).sort();
    expect(membershipIds).toEqual([membership.id, membership2.id].sort());
  });
});
