import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_ACCEPT_INVITE_ROUTE,
  type AccountAcceptInviteRouteResponse,
} from "@pacetrack/schema";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
  await resetDb();
});

describe("User Accept Invite Route", () => {
  test("returns 400 when invite code is invalid", async () => {
    await resetDb();
    const { cookie, csrfToken, account } = await setTestSession();

    const response = await app.request(ACCOUNT_ACCEPT_INVITE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        code: "invalid-code",
        email: account.email,
        tenantId: "some-tenant-id",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountAcceptInviteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Invalid request");
  });
});
