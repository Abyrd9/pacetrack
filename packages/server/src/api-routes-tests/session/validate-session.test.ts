import type { ValidateSessionRouteResponse } from "@pacetrack/schema";
import { VALIDATE_SESSION_ROUTE_PATH } from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

let cookie: string | undefined;
let csrfToken: string | undefined;
let tenantId: string | undefined;

beforeAll(async () => {
	await resetDb();
	const session = await setTestSession({
		email: "test@test+session+test.com",
		password: "password123",
	});

	cookie = session.cookie;
	csrfToken = session.csrfToken;
	tenantId = session.tenant.id;
});

describe("Validate Session Route", () => {
	test("should return 401 if no session token is provided", async () => {
		const response = await app.request(VALIDATE_SESSION_ROUTE_PATH, {
			method: "POST",
			headers: {},
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as ValidateSessionRouteResponse;
		expect(body.errors?.global).toBe("Unauthorized");
	});

	test("should return 401 if user is not found", async () => {
		const response = await app.request(VALIDATE_SESSION_ROUTE_PATH, {
			method: "POST",
			headers: {
				"x-session-token": "invalid-token",
			},
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as ValidateSessionRouteResponse;
		expect(body.errors?.global).toBe("Unauthorized");
	});

	test("should return 200 with user data if session is valid", async () => {
		if (!cookie || !csrfToken || !tenantId)
			throw new Error("Cookie, CSRF token, or tenantId is not set");

		const response = await app.request(VALIDATE_SESSION_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				tenantId,
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as ValidateSessionRouteResponse;
		expect(data.status).toBe("ok");
		expect(data.payload?.user_id).toBeDefined();
		expect(data.payload?.tenant_id).toBe(tenantId);
	});
});
