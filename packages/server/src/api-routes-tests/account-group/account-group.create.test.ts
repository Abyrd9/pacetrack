import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GROUP_CREATE_ROUTE,
	type AccountGroupCreateRouteResponse,
	account_group_table,
	account_metadata_table,
	DEFAULT_ROLES,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
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

describe("Account Group Create Route", () => {
	test("creates account group when account has manage_roles", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "My Account Group",
				description: "Test Desc",
				tenant_id: tenant.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupCreateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(account_group_table)
			.where(eq(account_group_table.id, body.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].tenant_id).toBe(tenant.id);
	});

	test("returns 403 when account lacks manage_roles", async () => {
		const { account, cookie, csrfToken, tenant } = await setTestSession();

		// Downgrade role to MEMBER (no manage_roles)
		const [basicRole] = await db
			.insert(role_table)
			.values({
				name: "Basic",
				kind: "member",
				allowed: DEFAULT_ROLES.MEMBER.allowed,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db
			.update(account_metadata_table)
			.set({ role_id: basicRole.id })
			.where(
				and(
					eq(account_metadata_table.account_id, account.id),
					eq(account_metadata_table.tenant_id, tenant.id),
				),
			);

		const response = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Should Fail",
				tenant_id: tenant.id,
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as AccountGroupCreateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to create account groups",
		);
	});

	test("creates account group with parent_group_id", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create parent group
		const parentResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Parent Department",
				description: "Parent group",
				tenant_id: tenant.id,
			}),
		});

		expect(parentResponse.status).toBe(200);
		const parentBody =
			(await parentResponse.json()) as AccountGroupCreateRouteResponse;
		expect(parentBody.status).toBe("ok");
		if (parentBody.status !== "ok") throw new Error("unexpected");

		// Create child group
		const childResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Child Team",
				description: "Child group",
				tenant_id: tenant.id,
				parent_group_id: parentBody.payload.id,
			}),
		});

		expect(childResponse.status).toBe(200);
		const childBody =
			(await childResponse.json()) as AccountGroupCreateRouteResponse;
		expect(childBody.status).toBe("ok");
		if (childBody.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(account_group_table)
			.where(eq(account_group_table.id, childBody.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].parent_group_id).toBe(parentBody.payload.id);
	});

	test("rejects creating group with non-existent parent", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Should Fail",
				tenant_id: tenant.id,
				parent_group_id: "non-existent-id",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGroupCreateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toContain("Parent group not found");
	});

	test("rejects creating group with parent from different tenant", async () => {
		const { user, cookie, csrfToken, tenant } = await setTestSession();

		// Create a different tenant's group
		const { tenant_table } = await import("@pacetrack/schema");
		const otherTenant = await db
			.insert(tenant_table)
			.values({
				name: "Other Tenant",
				kind: "org",
				created_by: user.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const otherGroup = await db
			.insert(account_group_table)
			.values({
				name: "Other Group",
				tenant_id: otherTenant[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const response = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Should Fail",
				tenant_id: tenant.id,
				parent_group_id: otherGroup[0].id,
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGroupCreateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toContain("Parent group not found");
	});
});
