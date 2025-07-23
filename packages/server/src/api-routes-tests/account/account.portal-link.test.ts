import { beforeAll, describe, expect, spyOn, test } from "bun:test";
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ACCOUNT_PORTAL_LINK_ROUTE_PATH,
  DEFAULT_ROLES,
  account_table,
  role_table,
  users_to_tenants_table,
  type AccountPortalLinkRouteResponse,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
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

describe("Account Portal Link Route", () => {
  test("returns 401 when unauthenticated (CSRF token required)", async () => {
    const response = await app.request(ACCOUNT_PORTAL_LINK_ROUTE_PATH, {
      method: "POST",
    });
    expect(response.status).toBe(401);
  });

  test("successfully generates billing portal link", async () => {
    const { cookie, csrfToken, account } = await setTestSession();

    const fakeSession = {
      url: "https://portal.test",
      lastResponse: {
        headers: {},
        requestId: "req_1",
        statusCode: 200,
      },
    } as unknown as Stripe.Response<Stripe.BillingPortal.Session>;
    const portalSpy = spyOn(
      stripe.billingPortal.sessions,
      "create"
    ).mockResolvedValue(fakeSession);

    const response = await app.request(ACCOUNT_PORTAL_LINK_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountPortalLinkRouteResponse;
    expect(body.status).toBe("ok");
    expect(body.payload?.url).toBe("https://portal.test");

    expect(portalSpy).toHaveBeenCalledWith({
      customer: account.customer_id,
      return_url: expect.any(String),
    });

    portalSpy.mockRestore();
  });

  test("returns 404 when account not found", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_PORTAL_LINK_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: "non-existent" }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as AccountPortalLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account not found");
  });

  test("returns 400 when account has no Stripe customer", async () => {
    const { cookie, csrfToken, account } = await setTestSession();
    await db
      .update(account_table)
      .set({ customer_id: null })
      .where(eq(account_table.id, account.id));

    const response = await app.request(ACCOUNT_PORTAL_LINK_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountPortalLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account has no Stripe customer");
  });

  test("returns 403 when user lacks manage_billing permission", async () => {
    const { cookie, csrfToken, account, user, tenant } = await setTestSession();

    // Create basic role without manage_billing
    const [basicRole] = await db
      .insert(role_table)
      .values({
        name: "Basic",
        kind: "user",
        allowed: DEFAULT_ROLES.USER.allowed,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    await db
      .update(users_to_tenants_table)
      .set({ role_id: basicRole.id })
      .where(
        and(
          eq(users_to_tenants_table.user_id, user.id),
          eq(users_to_tenants_table.tenant_id, tenant.id)
        )
      );

    const response = await app.request(ACCOUNT_PORTAL_LINK_ROUTE_PATH, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ accountId: account.id }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as AccountPortalLinkRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized");
  });
});
