import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  account_table,
  SESSION_GET_ACCOUNTS_META_ROUTE,
  type SessionGetAccountsMetaRouteResponse,
  tenant_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
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

describe("Session Get Accounts Meta Route", () => {
  test("returns accounts metadata for user with single account", async () => {
    await resetDb();
    const { cookie, csrfToken, user, account, tenant } = await setTestSession();

    const response = await app.request(SESSION_GET_ACCOUNTS_META_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionGetAccountsMetaRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.session).toBeDefined();
    expect(body.payload?.all).toBeDefined();

    // Should have 1 account
    expect(body.payload?.all.length).toBe(1);
    const accountData = body.payload?.all[0];
    expect(accountData?.account.id).toBe(account.id);
    expect(accountData?.account.email).toBe(account.email);

    // Should have 1 tenant for that account
    expect(accountData?.tenants.length).toBe(1);
    expect(accountData?.tenants[0].tenant.id).toBe(tenant.id);
  });

  test("returns accounts metadata for user with multiple accounts and tenants", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      account: firstAccount,
      tenant: firstTenant,
    } = await setTestSession();

    // Create a second account for the same user
    const password = "password123";
    const hashedPassword = await Bun.password.hash(password);

    const [secondAccount] = await db
      .insert(account_table)
      .values({
        email: "second@test.com",
        password: hashedPassword,
        user_id: user.id,
      })
      .returning();

    // Create a personal tenant for second account
    const [secondTenant] = await db
      .insert(tenant_table)
      .values({
        name: "Second Personal",
        kind: "personal",
        created_by: user.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: secondAccount.id,
      tenant_id: secondTenant.id,
      role_id: ownerRole!.id,
    });

    // Create a third tenant (org) for the first account
    const [thirdTenant] = await db
      .insert(tenant_table)
      .values({
        name: "My Organization",
        kind: "org",
        created_by: user.id,
      })
      .returning();

    await db.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: firstAccount.id,
      tenant_id: thirdTenant.id,
      role_id: ownerRole!.id,
    });

    const response = await app.request(SESSION_GET_ACCOUNTS_META_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionGetAccountsMetaRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();

    // Should have 2 accounts
    expect(body.payload?.all.length).toBe(2);

    // First account should have 2 tenants
    const firstAccountData = body.payload?.all.find(
      (a) => a.account.id === firstAccount.id
    );
    expect(firstAccountData).toBeDefined();
    expect(firstAccountData?.tenants.length).toBe(2);

    // Second account should have 1 tenant
    const secondAccountData = body.payload?.all.find(
      (a) => a.account.id === secondAccount.id
    );
    expect(secondAccountData).toBeDefined();
    expect(secondAccountData?.tenants.length).toBe(1);
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(SESSION_GET_ACCOUNTS_META_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as SessionGetAccountsMetaRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns empty arrays for user with no accounts", async () => {
    await resetDb();
    const { cookie, csrfToken, user, account } = await setTestSession();

    // Delete the account metadata to simulate a user with no tenants
    await db
      .delete(account_metadata_table)
      .where(eq(account_metadata_table.user_id, user.id));

    const response = await app.request(SESSION_GET_ACCOUNTS_META_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionGetAccountsMetaRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.all).toBeDefined();
    expect(body.payload?.all.length).toBe(0);
    expect(body.payload?.session.length).toBe(0);
  });
});
