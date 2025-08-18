import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { TENANT_UPDATE_ROUTE_PATH, tenant_table } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
	await resetDb();
});

beforeEach(() => {
	// Reset all mocks before each test
	mock.restore();
});

describe("Tenant Update Route", () => {
	test("should return 401 if user is not authenticated (CSRF token required)", async () => {
		const response = await app.request(TENANT_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				tenantId: "some-tenant-id",
				name: "Updated Tenant",
			}),
		});

		expect(response.status).toBe(401);
	});

	test("should return 400 if required fields are missing", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(TENANT_UPDATE_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({
				// missing id entirely
				name: "Updated Tenant",
			}),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.status).toBe("error");
		expect(body.errors.id).toBeDefined();
	});

	test("should return 400 if image has invalid mime type", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const form = new FormData();
		form.append("id", tenant.id);
		const badFile = new File([new Uint8Array([1, 2, 3])], "bad.txt", {
			type: "text/plain",
		});
		form.append("image", badFile);

		const response = await app.request(TENANT_UPDATE_ROUTE_PATH, {
			method: "POST",
			body: form,
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
		});

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.status).toBe("error");
		expect(body.errors.image).toBeDefined();
	});

	test("should update tenant successfully", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(TENANT_UPDATE_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({
				id: tenant.id,
				name: "Updated Tenant Name",
			}),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
		expect(body.payload.name).toBe("Updated Tenant Name");

		// Verify the update in the database
		const updatedTenant = await db
			.select()
			.from(tenant_table)
			.where(eq(tenant_table.id, tenant.id))
			.limit(1);
		expect(updatedTenant[0].name).toBe("Updated Tenant Name");
	});

	test("should work with form data", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const form = new FormData();
		form.append("id", tenant.id);
		form.append("name", "Updated Tenant Name");

		const response = await app.request(TENANT_UPDATE_ROUTE_PATH, {
			method: "POST",
			body: form,
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
		expect(body.payload.name).toBe("Updated Tenant Name");
	});
});
