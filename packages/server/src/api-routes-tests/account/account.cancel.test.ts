import {
  ACCOUNT_CANCEL_ROUTE_PATH,
  account_table,
  type AccountCancelRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, spyOn, test } from "bun:test";
import { eq } from "drizzle-orm";
import { stripe } from "src/utils/helpers/stripe";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import type Stripe from "stripe";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
  await resetDb();
});

describe("Account Cancel Route", () => {
  test("cancels subscription successfully", async () => {
    const { cookie, csrfToken, account } = await setTestSession();

    const fakeSubscription = {
      id: "sub_123",
      status: "canceled",
      lastResponse: {
        headers: {},
        requestId: "req_1",
        statusCode: 200,
      },
    } as Stripe.Response<Stripe.Subscription>;

    const cancelSpy = spyOn(stripe.subscriptions, "cancel").mockResolvedValue(
      fakeSubscription
    );

    const response = await app.request(ACCOUNT_CANCEL_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountCancelRouteResponse;
    expect(body.status).toBe("ok");

    expect(cancelSpy).toHaveBeenCalledWith(account.subscription_id);

    cancelSpy.mockRestore();
  });

  test("returns 404 when account not found", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_CANCEL_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: "non-existent" }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as AccountCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account not found");
  });

  test("returns 400 when account has no subscription", async () => {
    const { cookie, csrfToken, user, account } = await setTestSession();

    // Remove subscription from the user's account
    await db
      .update(account_table)
      .set({ subscription_id: null })
      .where(eq(account_table.id, account.id));

    const response = await app.request(ACCOUNT_CANCEL_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("No active subscription");
  });

  test("returns 403 when user lacks manage_billing permission", async () => {
    const { cookie, csrfToken, account } = await setTestSession();

    // Create a user without manage_billing permission
    const {
      user: regularUser,
      cookie: regularCookie,
      csrfToken: regularCsrfToken,
    } = await setTestSession({
      email: "regular@test.com",
      password: "password123",
    });

    const response = await app.request(ACCOUNT_CANCEL_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        regularCookie,
        regularCsrfToken,
        "POST",
        {
          "Content-Type": "application/json",
        }
      ),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as AccountCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized");
  });
});
