import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE,
  type AccountGroupAddAccountsRouteResponse,
  account_to_account_group_table,
  account_to_tenant_table,
  DEFAULT_ROLES,
  role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
import { createTestAccountGroup } from "src/utils/test-helpers/create-test-account-group";
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

describe("Account Group Add Accounts Route", () => {
  test("adds accounts to a account group when account has manage_accounts permission", async () => {
    const { cookie, tenant, account, csrfToken } = await setTestSession();
    const accountGroup = await createTestAccountGroup(tenant.id, account.id);
    const { account: account1 } = await createTestAccount(
      tenant.id,
      "account1@test.com"
    );
    const { account: account2 } = await createTestAccount(
      tenant.id,
      "account2@test.com"
    );

    const response = await app.request(ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: [account1.id, account2.id],
      }),
    });

    expect(response.status).toBe(200);
    const body =
      (await response.json()) as AccountGroupAddAccountsRouteResponse;
    expect(body.status).toBe("ok");

    // Verify DB
    const inDb = await db
      .select()
      .from(account_to_account_group_table)
      .where(
        eq(account_to_account_group_table.account_group_id, accountGroup.id)
      );
    expect(inDb).toHaveLength(3);
    expect(inDb.map((r) => r.account_id).sort()).toEqual(
      [account.id, account1.id, account2.id].sort()
    );
  });

  test("returns 400 if account group does not exist", async () => {
    const { cookie, tenant, csrfToken } = await setTestSession();
    const { account: account1 } = await createTestAccount(
      tenant.id,
      "account3@test.com"
    );
    const nonExistentAccountGroupId = "a-non-existent-account-group-id";

    const response = await app.request(ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: nonExistentAccountGroupId,
        accountIds: [account1.id],
      }),
    });

    expect(response.status).toBe(400);
    const body =
      (await response.json()) as AccountGroupAddAccountsRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account group not found");
  });

  test("returns 403 when account lacks manage_accounts permission", async () => {
    const { account, cookie, tenant, csrfToken } = await setTestSession();
    const accountGroup = await createTestAccountGroup(
      tenant.id,
      account.id,
      "Another Team"
    );
    const { account: accountToAdd } = await createTestAccount(
      tenant.id,
      "account4@test.com"
    );

    // Downgrade role to MEMBER (no manage_accounts)
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

    const response = await app.request(ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: [accountToAdd.id],
      }),
    });

    expect(response.status).toBe(403);
    const body =
      (await response.json()) as AccountGroupAddAccountsRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized to add accounts");
  });

  test("does not add duplicate accounts to the account group", async () => {
    const { cookie, tenant, account, csrfToken } = await setTestSession();
    const accountGroup = await createTestAccountGroup(
      tenant.id,
      account.id,
      "Duplicate Test Team"
    );
    const { account: account1 } = await createTestAccount(
      tenant.id,
      "account5@test.com"
    );
    const { account: account2 } = await createTestAccount(
      tenant.id,
      "account6@test.com"
    );

    // Pre-add account1 to the account group
    await db.insert(account_to_account_group_table).values({
      account_group_id: accountGroup.id,
      account_id: account1.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    const response = await app.request(ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountGroupId: accountGroup.id,
        accountIds: [account1.id, account2.id],
      }),
    });

    expect(response.status).toBe(200);
    const body =
      (await response.json()) as AccountGroupAddAccountsRouteResponse;
    expect(body.status).toBe("ok");

    // Verify DB
    const inDb = await db
      .select()
      .from(account_to_account_group_table)
      .where(
        eq(account_to_account_group_table.account_group_id, accountGroup.id)
      );
    expect(inDb).toHaveLength(3);
    expect(inDb.map((r) => r.account_id).sort()).toEqual(
      [account.id, account1.id, account2.id].sort()
    );
  });
});
