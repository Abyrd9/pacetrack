import { beforeAll, describe, expect, test } from "bun:test";
import {
  SESSION_REVOKE_ALL_ROUTE,
  type SessionRevokeAllRouteResponse,
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

describe("Session Revoke All Route", () => {
  test("revokes all other sessions while keeping the current one active", async () => {
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(SESSION_REVOKE_ALL_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionRevokeAllRouteResponse;
    expect(body.status).toBe("ok");
  });
});
