import { beforeAll, describe, expect, spyOn, test } from "bun:test";
import {
  account_table,
  FORGOT_PASSWORD_ROUTE,
  type ForgotPasswordRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";
import { resend } from "../../utils/helpers/resend";

const resendSendSpy = spyOn(resend.emails, "send").mockResolvedValue({
  id: "local-dev",
});

beforeAll(async () => {
  await resetDb();

  // Create a test user and account
  const hashedPassword = await Bun.password.hash("password123");

  // Create user first
  const [user] = await db.insert(user_table).values({}).returning();

  // Create account with email/password
  await db.insert(account_table).values({
    email: "test@example.com",
    password: hashedPassword,
    user_id: user.id,
  });
});

describe("Forgot Password Route", () => {
  test("should return 400 if email is not provided", async () => {
    const form = new FormData();

    const response = await app.request(FORGOT_PASSWORD_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ForgotPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.email).toBeDefined();
  });

  test("should return 400 if email is not valid", async () => {
    const form = new FormData();
    form.append("email", "invalid-email");

    const response = await app.request(FORGOT_PASSWORD_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ForgotPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.email).toBeDefined();
  });

  test("should return 400 if user does not exist", async () => {
    const form = new FormData();
    form.append("email", "nonexistent@example.com");

    const response = await app.request(FORGOT_PASSWORD_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ForgotPasswordRouteResponse;

    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.form).toBe("Account not found");
  });

  test("should return 200 and send reset email if user exists", async () => {
    const form = new FormData();
    form.append("email", "test@example.com");

    const response = await app.request(FORGOT_PASSWORD_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ForgotPasswordRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();
    expect(body.payload?.email).toBe("test@example.com");

    // Verify that the reset token and expiration were set in the database
    const account = await db.query.account_table.findFirst({
      where: eq(account_table.email, "test@example.com"),
    });

    expect(account).toBeTruthy();
    expect(account?.reset_password_token).toBeTruthy();
    expect(account?.reset_password_expires).toBeTruthy();

    // Verify the reset token expiration is in the future
    expect(account?.reset_password_expires?.getTime()).toBeGreaterThan(
      Date.now()
    );

    // Verify that the email was sent
    expect(resendSendSpy).toHaveBeenCalled();
    expect(resendSendSpy).toHaveBeenCalledTimes(1);
  });
});
