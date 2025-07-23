import { beforeAll, describe, expect, test } from "bun:test";
import {
  USER_GET_BY_ID_ROUTE,
  type UserGetByIdRouteResponse,
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

describe("User Get By ID Route", () => {
  test("returns user when user exists", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a test user
    const [testUser] = await db.insert(user_table).values({}).returning();

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserGetByIdRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("unexpected");

    expect(body.payload.id).toBe(testUser.id);
    expect(body.payload.created_at).toBeDefined();
    expect(body.payload.deleted_at).toBeNull();
  });

  test("returns 404 when user does not exist", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: "non-existent-user-id",
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as UserGetByIdRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("User not found");
  });

  test("returns 404 when user is soft deleted", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    // Create a test user
    const [testUser] = await db.insert(user_table).values({}).returning();

    // Soft delete the user
    await db
      .update(user_table)
      .set({ deleted_at: sql`now()` })
      .where(eq(user_table.id, testUser.id));

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: testUser.id,
      }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as UserGetByIdRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("User not found");
  });

  test("returns 400 for invalid request body", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: 123, // Invalid type
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserGetByIdRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 for missing userId", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserGetByIdRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(USER_GET_BY_ID_ROUTE.path, {
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
});
