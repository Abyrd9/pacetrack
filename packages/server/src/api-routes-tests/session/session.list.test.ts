import { beforeAll, describe, expect, test } from "bun:test";
import {
  SESSION_LIST_ROUTE,
  type SessionListRouteResponse,
} from "@pacetrack/schema";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { createTwoSessions } from "src/utils/test-helpers/create-two-sessions";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";

beforeAll(async () => {
  await resetDb();
});

describe("Session List Route", () => {
  test("returns only active (non-revoked) sessions for the current user", async () => {
    const { cookie, currentSessionId, otherSessionId } =
      await createTwoSessions();

    // Revoke the other session using Redis
    await getSessionClient().invalidate({ sessionId: otherSessionId });

    const response = await app.request(SESSION_LIST_ROUTE.path, {
      method: "GET",
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as SessionListRouteResponse;
    expect(body.status).toBe("ok");
    if (body.status !== "ok") throw new Error("Unexpected error response");

    // Should only contain the current, active session
    expect(body.payload.sessions).toHaveLength(1);
    expect(body.payload.sessions[0].id).toBe(currentSessionId);
  });
});
