import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_UPDATE_PASSWORD_ROUTE,
  account_table,
  type UpdatePasswordRouteResponse,
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

describe("Account Update Password Route", () => {
  test("successfully updates password", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const newPassword = "newpassword123";
    const form = new FormData();
    form.append("password", newPassword);
    form.append("passwordConfirmation", newPassword);

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UpdatePasswordRouteResponse;

    expect(body.status).toBe("ok");
    expect(body.payload).toBeDefined();

    // Verify password was updated in database
    const updatedAccount = await db.query.account_table.findFirst({
      where: eq(account_table.id, account.id),
    });
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.password).toBeDefined();
    if (!updatedAccount?.password) throw new Error("Password not found");

    // Verify new password works
    const isValid = await Bun.password.verify(
      newPassword,
      updatedAccount.password
    );
    expect(isValid).toBe(true);

    // Verify old password doesn't work anymore
    const oldPasswordWorks = await Bun.password.verify(
      "password",
      updatedAccount.password
    );
    expect(oldPasswordWorks).toBe(false);
  });

  test("returns 400 when password is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when passwordConfirmation is missing", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("password", "newpassword123");

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when passwords don't match", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const form = new FormData();
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "differentpassword");

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
  });

  test("returns 400 when password is too short", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const shortPassword = "123";
    const form = new FormData();
    form.append("password", shortPassword);
    form.append("passwordConfirmation", shortPassword);

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors).toBeDefined();
    expect(body.errors?.password).toBeDefined();
  });

  test("returns 401 when not authenticated", async () => {
    await resetDb();

    const form = new FormData();
    form.append("password", "newpassword123");
    form.append("passwordConfirmation", "newpassword123");

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Unauthorized");
  });

  test("hashes password securely", async () => {
    await resetDb();
    const { account, cookie, csrfToken } = await setTestSession();

    const newPassword = "securepassword123";
    const form = new FormData();
    form.append("password", newPassword);
    form.append("passwordConfirmation", newPassword);

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    expect(response.status).toBe(200);

    // Verify password is hashed (not stored in plain text)
    const updatedAccount = await db.query.account_table.findFirst({
      where: eq(account_table.id, account.id),
    });
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.password).toBeDefined();
    expect(updatedAccount?.password).not.toBe(newPassword);

    // Verify hash is strong (bcrypt hashes start with $2, argon2 with $argon2)
    expect(
      updatedAccount?.password?.startsWith("$2") ||
        updatedAccount?.password?.startsWith("$argon2")
    ).toBe(true);
  });

  test("allows updating to same password", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const newPassword = "samepassword123";
    const form = new FormData();
    form.append("password", newPassword);
    form.append("passwordConfirmation", newPassword);

    // Update password first time
    await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form,
    });

    // Update to same password again
    const form2 = new FormData();
    form2.append("password", newPassword);
    form2.append("passwordConfirmation", newPassword);

    const response = await app.request(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
      body: form2,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UpdatePasswordRouteResponse;
    expect(body.status).toBe("ok");
  });
});
