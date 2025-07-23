import { beforeAll, describe, expect, spyOn, test } from "bun:test";
import {
  MEMBERSHIP_CANCEL_ROUTE,
  type MembershipCancelRouteResponse,
  membership_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { stripe } from "src/utils/helpers/stripe/stripe-client";
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

if (!stripe) throw new Error("Stripe is not initialized");

describe("Membership Cancel Route", () => {
  test("cancels subscription successfully", async () => {
    const { cookie, csrfToken, membership } = await setTestSession();

    const fakeSubscription = {
      id: "sub_123",
      status: "canceled",
      lastResponse: {
        headers: {},
        requestId: "req_1",
        statusCode: 200,
      },
    } as Stripe.Response<Stripe.Subscription>;

    const cancelSpy = spyOn(stripe!.subscriptions, "cancel").mockResolvedValue(
      fakeSubscription
    );

    const response = await app.request(MEMBERSHIP_CANCEL_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ membershipId: membership.id }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as MembershipCancelRouteResponse;
    expect(body.status).toBe("ok");

    expect(cancelSpy).toHaveBeenCalledWith(membership.subscription_id);

    cancelSpy.mockRestore();
  });

  test("returns 404 when membership not found", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(MEMBERSHIP_CANCEL_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ membershipId: "non-existent" }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as MembershipCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Membership not found");
  });

  test("returns 400 when membership has no subscription", async () => {
    const { cookie, csrfToken, user, membership } = await setTestSession();

    // Remove subscription from the user's membership
    await db
      .update(membership_table)
      .set({ subscription_id: null })
      .where(eq(membership_table.id, membership.id));

    const response = await app.request(MEMBERSHIP_CANCEL_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ membershipId: membership.id }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as MembershipCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("No active subscription");
  });

  test("returns 403 when user lacks manage_billing permission", async () => {
    const { cookie, csrfToken, membership } = await setTestSession();

    // Create a user without manage_billing permission
    const { cookie: regularCookie, csrfToken: regularCsrfToken } =
      await setTestSession();

    const response = await app.request(MEMBERSHIP_CANCEL_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(
        regularCookie,
        regularCsrfToken,
        "POST",
        {
          "Content-Type": "application/json",
        }
      ),
      body: JSON.stringify({ membershipId: membership.id }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as MembershipCancelRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized");
  });
});
