import { SIGN_OUT_ROUTE_PATH } from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
	await resetDb();
});

describe("Sign Out Route", () => {
	test("should return 401 if user is not authenticated (CSRF token required)", async () => {
		const response = await app.request(SIGN_OUT_ROUTE_PATH, {
			method: "POST",
		});

		expect(response.status).toBe(401);
	});

	test("should successfully sign out user and invalidate session", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(SIGN_OUT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});

	test("should invalidate all user sessions on sign out", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(SIGN_OUT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});
});
