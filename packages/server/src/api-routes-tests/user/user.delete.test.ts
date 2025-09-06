import { beforeAll, describe, expect, test } from "bun:test";
import {
  USER_DELETE_ROUTE,
  type UserDeleteRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
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

describe("User Delete Route", () => {
  test("deletes user successfully", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a test user
    const [testUser] = await db.insert(user_table).values({}).returning();

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("unexpected");

    expect(body.payload.message).toBe("User deleted successfully");

    // Verify user is soft deleted
    const deletedUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, testUser.id),
    });
    expect(deletedUser?.deleted_at).toBeDefined();
  });

  test("returns 404 when user does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: "non-existent-user-id",
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("User not found");
  });

  test("returns 404 when user is already soft deleted", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a test user and immediately soft delete it
    const [testUser] = await db.insert(user_table).values({}).returning();

    await db
      .update(user_table)
      .set({ deleted_at: sql`now()` })
      .where(eq(user_table.id, testUser.id));

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("User not found");
  });

  test("returns 400 for invalid request body", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: 123, // Invalid type
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 for missing userId", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "some-user-id",
      }),
    });

    expect(response.status).toBe(401);
  });

  test("soft delete allows user to be 'deleted' multiple times", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a test user
    const [testUser] = await db.insert(user_table).values({}).returning();

    // First delete
    const response1 = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response1.status).toBe(200);

    // Second delete attempt should return 404 since user is already deleted
    const response2 = await app.request(USER_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response2.status).toBe(404);
    const body2 = (await response2.json()) as UserDeleteRouteResponse;
    expect(body2.status).toBe("error");
    expect(body2.errors?.global).toBe("User not found");
  });
});
