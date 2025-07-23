import {
	SESSION_REVOKE_ROUTE_PATH,
	type SessionRevokeRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { createTwoSessions } from "src/utils/test-helpers/create-two-sessions";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { makeAuthenticatedRequest } from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
	await resetDb();
});

describe("Session Revoke Route", () => {
	test("successfully revokes another active session", async () => {
		const { cookie, currentSessionId, otherSessionId, csrfToken } =
			await createTwoSessions();

		const response = await app.request(SESSION_REVOKE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ sessionId: otherSessionId }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as SessionRevokeRouteResponse;
		expect(body.status).toBe("ok");
	});

	test("returns 404 when session does not exist", async () => {
		const { cookie, csrfToken } = await createTwoSessions();

		const response = await app.request(SESSION_REVOKE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ sessionId: "non-existent-id" }),
		});

		expect(response.status).toBe(404);
		const body = (await response.json()) as SessionRevokeRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Session not found");
	});

	test("returns 400 when attempting to revoke current session", async () => {
		const { cookie, currentSessionId, csrfToken } = await createTwoSessions();

		const response = await app.request(SESSION_REVOKE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ sessionId: currentSessionId }),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SessionRevokeRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"Use sign-out instead of revoking current session",
		);
	});
});
