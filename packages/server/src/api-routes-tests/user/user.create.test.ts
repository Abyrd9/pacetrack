import { beforeAll, describe, expect, test } from "bun:test";
import {
  USER_CREATE_ROUTE,
  type UserCreateRouteResponse,
  user_table,
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

describe("User Create Route", () => {
  test("creates a user successfully", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        display_name: "Test User",
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserCreateRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("unexpected");

    expect(body.payload.id).toBeDefined();
    expect(body.payload.created_at).toBeDefined();
    expect(body.payload.deleted_at).toBeNull();

    // Verify user was created in database
    const createdUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, body.payload.id),
    });
    expect(createdUser).toBeDefined();
    expect(createdUser?.id).toBe(body.payload.id);
  });

  test("creates a user without display_name", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserCreateRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("unexpected");

    expect(body.payload.id).toBeDefined();
    expect(body.payload.created_at).toBeDefined();
    expect(body.payload.deleted_at).toBeNull();

    // Verify user was created in database
    const createdUser = await db.query.user_table.findFirst({
      where: eq(user_table.id, body.payload.id),
    });
    expect(createdUser).toBeDefined();
  });

  test("returns 400 for invalid request body", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(USER_CREATE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        display_name: 123, // Invalid type
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UserCreateRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const response = await app.request(USER_CREATE_ROUTE.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: "Test User",
      }),
    });

    expect(response.status).toBe(401);
  });
});
