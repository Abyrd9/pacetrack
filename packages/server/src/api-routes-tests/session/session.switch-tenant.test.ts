import {
	SESSION_SWITCH_TENANT_ROUTE_PATH,
	account_table,
	tenant_table,
	users_to_tenants_table,
	type SessionSwitchTenantRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
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

describe("Session Switch Tenant Route", () => {
	test("successfully switches to another tenant the user has access to", async () => {
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create a new tenant for the same user
		const [newTenant] = await db
			.insert(tenant_table)
			.values({
				name: "New Tenant",
				account_id: tenant.account_id,
				created_by: user.id,
				kind: "org",
			})
			.returning();

		// Associate the user with the new tenant
		const ownerRole = await db.query.role_table.findFirst({
			where: (role, { eq }) => eq(role.kind, "owner"),
		});
		if (!ownerRole) throw new Error("Owner role not found");

		await db.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: newTenant.id,
			role_id: ownerRole.id,
			is_primary_contact: true,
			is_billing_contact: true,
		});

		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: newTenant.id }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("ok");
	});

	test("returns 404 when tenant does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: "non-existent-tenant-id" }),
		});

		expect(response.status).toBe(404);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Tenant not found");
	});

	test("returns 403 when user does not have access to the tenant", async () => {
		const { cookie, csrfToken } = await setTestSession();

		// Create a separate user and account for a different user
		const { user: otherUser } = await setTestSession({
			email: "other@test.com",
			password: "password123",
		});

		const [otherAccount] = await db
			.insert(account_table)
			.values({
				created_by: otherUser.id,
				customer_id: "cus_456",
				subscription_id: "sub_456",
			})
			.returning();

		const [otherTenant] = await db
			.insert(tenant_table)
			.values({
				name: "Other Tenant",
				account_id: otherAccount.id,
				created_by: otherUser.id,
				kind: "org",
			})
			.returning();

		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: otherTenant.id }),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You don't have access to this organization",
		);
	});

	test("returns 401 when no session token is provided", async () => {
		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ tenant_id: "some-tenant-id" }),
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Unauthorized");
	});

	test("returns 400 when tenant_id is missing from request body", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.tenant_id).toBeDefined();
	});

	test("returns 400 when tenant_id is empty string", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: "" }),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SessionSwitchTenantRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.tenant_id).toBeDefined();
	});

	test("can switch between multiple tenants the user has access to", async () => {
		const { cookie, csrfToken, tenant: tenant1, user } = await setTestSession();

		// Create a second tenant for the same user
		const [tenant2] = await db
			.insert(tenant_table)
			.values({
				name: "Second Tenant",
				account_id: tenant1.account_id,
				created_by: user.id,
				kind: "org",
			})
			.returning();

		// Associate the user with the second tenant
		const ownerRole = await db.query.role_table.findFirst({
			where: (role, { eq }) => eq(role.kind, "owner"),
		});
		if (!ownerRole) throw new Error("Owner role not found");

		await db.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: tenant2.id,
			role_id: ownerRole.id,
			is_primary_contact: true,
			is_billing_contact: true,
		});

		// Switch to tenant2
		const response1 = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: tenant2.id }),
		});

		expect(response1.status).toBe(200);

		// Switch back to tenant1
		const response2 = await app.request(SESSION_SWITCH_TENANT_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenant_id: tenant1.id }),
		});

		expect(response2.status).toBe(200);
	});
});
