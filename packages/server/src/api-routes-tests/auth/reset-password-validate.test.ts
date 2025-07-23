import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { RESET_PASSWORD_VALIDATE_ROUTE_PATH, user_table } from "@pacetrack/schema";
import { desc, eq } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
  await resetDb();
});

beforeEach(() => {
  // Reset all mocks before each test
  mock.restore();
});

describe("Reset Password Validate Route", () => {
  test("should return 400 if email is not provided", async () => {
    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        code: "test-code",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.email).toBeDefined();
  });

  test("should return 400 if code is not provided", async () => {
    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "test@test.com",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.code).toBeDefined();
  });

  test("should return 400 if user is not found", async () => {
    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "nonexistent@test.com",
        code: "test-code",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.email).toBe("User not found");
  });

  test("should return 400 if code is invalid", async () => {
    // Create a test user with a reset password token
    const user = await db
      .insert(user_table)
      .values({
        email: "test@test.com",
        password: "hashed-password",
        reset_password_token: "valid-code",
        reset_password_expires: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      })
      .returning();

    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "test@test.com",
        code: "invalid-code",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.code).toBe("Invalid code");
  });

  test("should return 400 if code is expired", async () => {
    await resetDb();

    // Create a test user with a reset password token
    const hashedPassword = await Bun.password.hash("oldpassword");
    // Create a test user with an expired reset token
    await db.insert(user_table).values({
      email: "expired@example.com",
      password: hashedPassword,
      reset_password_token: "expired-token",
      reset_password_expires: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    });

    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "expired@example.com",
        code: "expired-token",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.errors.code).toBe("Code expired");
  });

  test("should validate code successfully", async () => {
    await resetDb();

    // Create a test user with a reset password token
    const hashedPassword = await Bun.password.hash("oldpassword");
    const resetToken = "valid-reset-token";
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await db.insert(user_table).values({
      email: "reset@example.com",
      password: hashedPassword,
      reset_password_token: resetToken,
      reset_password_expires: resetExpires,
    });

    const response = await app.request(RESET_PASSWORD_VALIDATE_ROUTE_PATH, {
      method: "POST",
      body: JSON.stringify({
        email: "reset@example.com",
        code: resetToken,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.payload.email).toBe("reset@example.com");
    expect(body.payload.code).toBe(resetToken);
  });
});
