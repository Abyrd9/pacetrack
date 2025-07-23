import { TENANT_CREATE_ROUTE_PATH } from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "..";

beforeAll(async () => {
	await resetDb();
});

describe("CSRF Protection", () => {
	test("should require CSRF token for POST requests", async () => {
		const { cookie } = await setTestSession();

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: {
				Cookie: cookie,
				// No CSRF token
			},
			body: form,
		});

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.error).toBe("CSRF token required");
	});

	test("should require CSRF token for PUT requests", async () => {
		const { cookie } = await setTestSession();

		const response = await app.request("/api/tenant/123", {
			method: "PUT",
			headers: {
				Cookie: cookie,
				"Content-Type": "application/json",
				// No CSRF token
			},
			body: JSON.stringify({ name: "Updated Tenant" }),
		});

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.error).toBe("CSRF token required");
	});

	test("should require CSRF token for DELETE requests", async () => {
		const { cookie } = await setTestSession();

		const response = await app.request("/api/tenant/123", {
			method: "DELETE",
			headers: {
				Cookie: cookie,
				// No CSRF token
			},
		});

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.error).toBe("CSRF token required");
	});

	test("should reject invalid CSRF tokens", async () => {
		const { cookie } = await setTestSession();

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: {
				Cookie: cookie,
				"x-csrf-token": "invalid-csrf-token",
			},
			body: form,
		});

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.error).toBe("Invalid CSRF token");
	});

	test("should accept valid CSRF tokens", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
			body: form,
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});

	test("should accept CSRF token via query parameter", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(
			`${TENANT_CREATE_ROUTE_PATH}?csrf_token=${csrfToken}`,
			{
				method: "POST",
				headers: {
					Cookie: cookie,
					// No CSRF token in header, but in query param
				},
				body: form,
			},
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});

	test("should allow auth endpoints without CSRF token", async () => {
		const form = new FormData();
		form.append("email", "test@example.com");
		form.append("password", "password123");

		const response = await app.request("/api/auth/sign-in", {
			method: "POST",
			body: form,
			// No cookie, no CSRF token
		});

		// Should not be blocked by CSRF protection (even if auth fails)
		expect(response.status).not.toBe(403);
	});

	test("should allow file serving without CSRF token", async () => {
		const response = await app.request("/serve/test-file", {
			method: "GET",
			// No cookie, no CSRF token
		});

		// Should not be blocked by CSRF protection
		expect(response.status).not.toBe(403);
	});

	test("should require both session and CSRF token", async () => {
		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: {
				"x-csrf-token": "some-token",
				// No cookie
			},
			body: form,
		});

		expect(response.status).toBe(401);
	});
});
