import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_GROUP_DELETE_ROUTE,
  type AccountGroupDeleteRouteResponse,
  account_group_table,
  account_metadata_table,
  DEFAULT_ROLES,
  role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
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

describe("Account Group Delete Route", () => {
  test("deletes account group when account has manage_settings", async () => {
    const { cookie, csrfToken, tenant } = await setTestSession();

    // Create a account group to delete
    const [accountGroup] = await db
      .insert(account_group_table)
      .values({
        name: "Account Group to Delete",
        tenant_id: tenant.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    const response = await app.request(ACCOUNT_GROUP_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountGroupDeleteRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("unexpected");

    // Verify DB
    const inDb = await db
      .select()
      .from(account_group_table)
      .where(eq(account_group_table.id, accountGroup.id));
    expect(inDb).toHaveLength(1);
    expect(inDb[0].deleted_at).not.toBeNull();
  });

  test("returns 400 when account group does not exist", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_GROUP_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: "non-existent-id",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountGroupDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account group not found");
  });

  test("returns 403 when account lacks manage_settings", async () => {
    const { account, cookie, csrfToken, tenant } = await setTestSession();

    // Create a account group to delete
    const [accountGroup] = await db
      .insert(account_group_table)
      .values({
        name: "Protected Account Group",
        tenant_id: tenant.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    // Downgrade role to MEMBER (no manage_settings)
    const [basicRole] = await db
      .insert(role_table)
      .values({
        name: "Basic",
        kind: "member",
        allowed: DEFAULT_ROLES.MEMBER.allowed,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db
      .update(account_metadata_table)
      .set({ role_id: basicRole.id })
      .where(
        and(
          eq(account_metadata_table.account_id, account.id),
          eq(account_metadata_table.tenant_id, tenant.id)
        )
      );

    const response = await app.request(ACCOUNT_GROUP_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
      }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as AccountGroupDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe(
      "You are not authorized to delete this account group"
    );
  });
});
