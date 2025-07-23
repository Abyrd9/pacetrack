import { beforeAll, describe, expect, test } from "bun:test";
import {
  RESET_PASSWORD_ROUTE_PATH,
  type ResetPasswordRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
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

  // Create a test user with an expired reset token
  await db.insert(user_table).values({
    email: "expired@example.com",
    password: hashedPassword,
    reset_password_token: "expired-token",
    reset_password_expires: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  });
});

describe("Reset Password Route", () => {
  test("should return 400 if email is not provided", async () => {
    const form = new FormData();
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.email).toBeDefined();
  });

  test("should return 400 if code is not provided", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.code).toBeDefined();
  });

  test("should return 400 if password is not provided", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "valid-reset-token");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.password).toBeDefined();
  });

  test("should return 400 if password confirmation is not provided", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.passwordConfirmation).toBeDefined();
  });

  test("should return 400 if email is not valid", async () => {
    const form = new FormData();
    form.append("email", "invalid-email");
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.email).toBeDefined();
  });

  test("should return 400 if password is less than 8 characters", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "valid-reset-token");
    form.append("password", "short");
    form.append("passwordConfirmation", "short");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.password).toBeDefined();
  });

  test("should return 400 if passwords do not match", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "differentpassword");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.passwordConfirmation).toBe("Passwords do not match");
  });

  test("should return 400 if user does not exist", async () => {
    const form = new FormData();
    form.append("email", "nonexistent@example.com");
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.form).toBe(
      "A user with this email does not exist, please sign up."
    );
  });

  test("should return 400 if reset token is invalid", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "invalid-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.code).toBe(
      "This link is invalid. Please request a new one."
    );
  });

  test("should return 400 if reset token is expired", async () => {
    const form = new FormData();
    form.append("email", "expired@example.com");
    form.append("code", "expired-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.code).toBe(
      "This link has expired. Please request a new one."
    );
  });

  test("should return 200 if password reset is successful", async () => {
    const form = new FormData();
    form.append("email", "reset@example.com");
    form.append("code", "valid-reset-token");
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(RESET_PASSWORD_ROUTE_PATH, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ResetPasswordRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.email).toBe("reset@example.com");

    // Verify that the reset token and expiration were cleared
    const user = await db.query.user_table.findFirst({
      where: eq(user_table.email, "reset@example.com"),
    });

    expect(user).toBeTruthy();
    expect(user?.reset_password_token).toBeNull();
    expect(user?.reset_password_expires).toBeNull();

    // Verify that the password was updated (can sign in with new password)
    const isPasswordUpdated =
      user?.password &&
      (await Bun.password.verify("newpassword123", user.password));
    expect(isPasswordUpdated).toBe(true);
  });
});
