import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import {
  ACCOUNT_CHANGE_EMAIL_ROUTE,
  ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE,
  account_table,
  type ConfirmEmailChangeRouteResponse,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { resend } from "src/utils/helpers/resend";
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

beforeEach(() => {
  mock.restore();
});

describe("Account Confirm Email Change Route", () => {
  test("returns 400 when required fields missing", async () => {
    const response = await app.request(ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
  });

  test("returns 400 when token invalid", async () => {
    const { cookie, csrfToken, account } = await setTestSession();

    // Initiate email change to generate token
    const newEmail = `new${account.email}`;
    const form = new FormData();
    form.append("email", newEmail);
    await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    const response = await app.request(ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, token: "wrong-token" }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ConfirmEmailChangeRouteResponse;
    expect(body.status).toBe("error");
  });

  test("returns 400 when token expired", async () => {
    const { account } = await setTestSession();
    const newEmail = `next${account.email}`;
    const token = "expired-token";

    // Manually set expired token in DB
    await db
      .update(account_table)
      .set({
        pending_email: newEmail,
        pending_email_token: token,
        pending_email_expires: new Date(Date.now() - 1000),
      })
      .where(eq(account_table.id, account.id));

    const response = await app.request(ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, token }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ConfirmEmailChangeRouteResponse;
    expect(body.status).toBe("error");
  });

  test("successfully confirms email change", async () => {
    const { cookie, csrfToken, account } = await setTestSession();
    const sendSpy = spyOn(resend.emails, "send").mockResolvedValue({
      id: "local-dev",
    });

    // Initiate change
    const newEmail = `final${account.email}`;
    const form = new FormData();
    form.append("email", newEmail);
    const initiateResp = await app.request(ACCOUNT_CHANGE_EMAIL_ROUTE.path, {
      method: "POST",
      body: form,
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });
    expect(initiateResp.status).toBe(200);

    // Retrieve token from DB
    const row = await db.query.account_table.findFirst({
      where: eq(account_table.id, account.id),
    });
    if (!row?.pending_email_token) throw new Error("No token set");
    const token = row.pending_email_token;

    const response = await app.request(ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, token }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ConfirmEmailChangeRouteResponse;
    expect(body.status).toBe("ok");

    // Verify DB email updated and pending cleared
    const updated = await db.query.account_table.findFirst({
      where: eq(account_table.id, account.id),
    });
    expect(updated?.email).toBe(newEmail);
    expect(updated?.pending_email).toBeNull();
    expect(updated?.pending_email_token).toBeNull();
    expect(updated?.pending_email_expires).toBeNull();

    expect(sendSpy).toHaveBeenCalled();
    sendSpy.mockRestore();
  });
});
