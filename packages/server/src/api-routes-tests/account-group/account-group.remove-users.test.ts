import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE,
  type AccountGroupRemoveAccountsRouteResponse,
  account_group_table,
  account_to_account_group_table,
  account_to_tenant_table,
  DEFAULT_ROLES,
  role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
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

describe("Account Group Remove Accounts Route", () => {
  test("removes accounts from a account group when account has manage_accounts permission", async () => {
    const { cookie, tenant, account, csrfToken } = await setTestSession();
    const { account: accountToRemove } = await createTestAccount(
      tenant.id,
      "test2@test.com"
    );

    const [accountGroup] = await db
      .insert(account_group_table)
      .values({
        name: "Test Account Group",
        tenant_id: tenant.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db.insert(account_to_account_group_table).values([
      { account_id: account.id, account_group_id: accountGroup.id },
      { account_id: accountToRemove.id, account_group_id: accountGroup.id },
    ]);

    const response = await app.request(ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: [accountToRemove.id],
      }),
    });

    expect(response.status).toBe(200);
    const body =
      (await response.json()) as AccountGroupRemoveAccountsRouteResponse;
    expect(body.status).toBe("ok");

    const accountsInTeam = await db
      .select()
      .from(account_to_account_group_table)
      .where(
        eq(account_to_account_group_table.account_group_id, accountGroup.id)
      );
    expect(accountsInTeam).toHaveLength(1);
    expect(accountsInTeam[0].account_id).toBe(account.id);
  });

  test("returns 403 when account lacks manage_accounts permission", async () => {
    const { cookie, tenant, account, csrfToken } = await setTestSession();
    const { account: accountToRemove } = await createTestAccount(
      tenant.id,
      "test3@test.com"
    );

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
      .update(account_to_tenant_table)
      .set({ role_id: basicRole.id })
      .where(
        and(
          eq(account_to_tenant_table.account_id, account.id),
          eq(account_to_tenant_table.tenant_id, tenant.id)
        )
      );

    const [accountGroup] = await db
      .insert(account_group_table)
      .values({
        name: "Test Account Group",
        tenant_id: tenant.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db.insert(account_to_account_group_table).values({
      account_id: accountToRemove.id,
      account_group_id: accountGroup.id,
    });

    const response = await app.request(ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: [accountToRemove.id],
      }),
    });

    expect(response.status).toBe(403);
    const body =
      (await response.json()) as AccountGroupRemoveAccountsRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe(
      "You are not authorized to remove accounts"
    );
  });

  test("returns 400 if team does not exist", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: "non-existent-account-group-id",
        accountIds: ["some-account-id"],
      }),
    });

    expect(response.status).toBe(400);
    const body =
      (await response.json()) as AccountGroupRemoveAccountsRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account group not found");
  });

  test("does not fail if accounts to be removed are not in the team", async () => {
    const { cookie, tenant, csrfToken } = await setTestSession();

    const [accountGroup] = await db
      .insert(account_group_table)
      .values({
        name: "Test Account Group",
        tenant_id: tenant.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    const response = await app.request(ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: ["non-existent-account-id"],
      }),
    });

    expect(response.status).toBe(200);
    const body =
      (await response.json()) as AccountGroupRemoveAccountsRouteResponse;
    expect(body.status).toBe("ok");
  });
});
