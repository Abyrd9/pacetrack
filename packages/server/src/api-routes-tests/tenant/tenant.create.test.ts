import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
	TENANT_CREATE_ROUTE_PATH,
	type TenantCreateRouteResponse,
} from "@pacetrack/schema";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

let cookie: string | undefined;
let csrfToken: string | undefined;

beforeAll(async () => {
	await resetDb();
	const session = await setTestSession();
	cookie = session.cookie;
	csrfToken = session.csrfToken;
});

beforeEach(() => {
	mock.restore();
});

describe("Admin Tenant Create Route", () => {
	test("should return 400 if name is not provided", async () => {
		if (!cookie || !csrfToken)
			throw new Error("Cookie or CSRF token is not set");

		const form = new FormData();
		form.append("account_id", "acc_123");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as TenantCreateRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.name).toBeDefined();
	});

	test("should create new account if account_id is not provided", async () => {
		if (!cookie || !csrfToken)
			throw new Error("Cookie or CSRF token is not set");

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("image_url", "https://example.com/image.jpg");

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
			body: form,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as TenantCreateRouteResponse;

		expect(body.status).toBe("ok");
		expect(body.payload).toBeDefined();
		expect(body.payload?.membership_id).toBeDefined();
	});

	test("should return 400 if image provided has invalid mime type", async () => {
		if (!cookie || !csrfToken)
			throw new Error("Cookie or CSRF token is not set");

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("account_id", "acc_123");
		const bad = new File([new Uint8Array([1, 2, 3])], "bad.txt", {
			type: "text/plain",
		});
		form.append("image", bad);

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as TenantCreateRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.image).toBeDefined();
	});

	test("should create tenant successfully", async () => {
		await resetDb();
		const { membership, cookie, csrfToken } = await setTestSession();

		const form = new FormData();
		form.append("name", "Test Tenant");
		form.append("membership_id", membership.id);

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
			body: form,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as TenantCreateRouteResponse;

		expect(body.status).toBe("ok");
		expect(body.payload).toBeDefined();
		expect(body.payload?.name).toBe("Test Tenant");
		expect(body.payload?.membership_id).toBe(membership.id);
		// no direct image_url support; only file upload optional

		// Verify tenant was created in database
		const tenant = await db.query.tenant_table.findFirst({
			where: (tenants, { eq }) => eq(tenants.name, "Test Tenant"),
		});
		expect(tenant).toBeDefined();
		expect(tenant?.membership_id).toBe(membership.id);
	});

	test("should handle JSON request body", async () => {
		await resetDb();
		const { membership, cookie, csrfToken } = await setTestSession();

		const response = await app.request(TENANT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Test Tenant",
				membership_id: membership.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as TenantCreateRouteResponse;

		expect(body.status).toBe("ok");
		expect(body.payload).toBeDefined();
		expect(body.payload?.name).toBe("Test Tenant");
	});

	test("should return 403 if CSRF token is missing", async () => {
		await resetDb();
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
		expect(body.errors.global).toBe("CSRF token required");
	});

	test("should return 403 if CSRF token is invalid", async () => {
		await resetDb();
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
		expect(body.errors.global).toBe("Invalid CSRF token");
	});
});
