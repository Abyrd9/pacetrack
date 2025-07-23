import { beforeAll, describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  account_table,
  SESSION_LINK_ACCOUNT_ROUTE,
  type SessionLinkAccountRouteResponse,
  tenant_table,
  user_table,
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

describe("Session Link Account Route", () => {
  test("successfully links two accounts belonging to different users and updates session", async () => {
    await resetDb();
    const { cookie, csrfToken, user: user1 } = await setTestSession();

    // Create a second account belonging to a different user with a personal tenant
    const password = "password123";
    const hashedPassword = await Bun.password.hash(password);

    const [user2] = await db
      .insert(user_table)
      .values({ created_at: new Date(), updated_at: new Date() })
      .returning();

    const [account2] = await db
      .insert(account_table)
      .values({
        email: "other@test.com",
        password: hashedPassword,
        user_id: user2.id,
      })
      .returning();

    const [tenant2] = await db
      .insert(tenant_table)
      .values({
        name: "Personal",
        kind: "personal",
        created_by: user2.id,
      })
      .returning();

    // Get owner role
    const ownerRole = await db.query.role_table.findFirst({
      where: (roles, { eq }) => eq(roles.name, "Owner"),
    });

    await db.insert(account_metadata_table).values({
      user_id: user2.id,
      account_id: account2.id,
      tenant_id: tenant2.id,
      role_id: ownerRole!.id,
    });

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "other@test.com",
        password: password,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("Account linked successfully");

    // Verify both accounts now belong to user1
    const accounts = await db
      .select()
      .from(account_table)
      .where(eq(account_table.user_id, user1.id));

    expect(accounts.length).toBe(2);

    // Verify user2 was soft-deleted
    const deletedUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, user2.id),
    });
    expect(deletedUser?.deleted_at).toBeTruthy();

    // Verify session cookie was set
    const setCookieHeaders = response.headers.getSetCookie();
    const sessionCookie = setCookieHeaders.find((c) =>
      c.startsWith("pacetrack-session=")
    );
    expect(sessionCookie).toBeDefined();
  });

  test("links account already belonging to same user and adds tenants to session", async () => {
    await resetDb();
    const {
      cookie,
      csrfToken,
      user,
      account: firstAccount,
    } = await setTestSession();

    // Create a second account for the same user with a tenant
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

    const [tenant] = await db
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
      tenant_id: tenant.id,
      role_id: ownerRole!.id,
    });

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "second@test.com",
        password: password,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload?.message).toBe("Account linked successfully");

    // Verify both accounts still belong to the user
    const accounts = await db
      .select()
      .from(account_table)
      .where(eq(account_table.user_id, user.id));

    expect(accounts.length).toBe(2);
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "other@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("returns 400 when email is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.email).toBeDefined();
  });

  test("returns 400 when password is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "other@test.com",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.password).toBeDefined();
  });

  test("returns 400 when account does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "nonexistent@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.form).toBe("Invalid email or password");
  });

  test("returns 400 when password is incorrect", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create another account to try to link
    await setTestSession(undefined, "other@test.com", "correctpassword");

    const response = await app.request(SESSION_LINK_ACCOUNT_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        email: "other@test.com",
        password: "wrongpassword",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as SessionLinkAccountRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.form).toBe("Invalid email or password");
  });
});
