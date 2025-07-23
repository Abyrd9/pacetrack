import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GROUP_CREATE_ROUTE,
	ACCOUNT_GROUP_UPDATE_ROUTE,
	type AccountGroupCreateRouteResponse,
	type AccountGroupUpdateRouteResponse,
	account_group_table,
	account_metadata_table,
	DEFAULT_ROLES,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import { createTestAccountGroup } from "src/utils/test-helpers/create-test-account-group";
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

describe("Account Group Update Route", () => {
	test("updates account group when account has manage_settings", async () => {
		const { cookie, tenant, account, csrfToken } = await setTestSession();
		const accountGroup = await createTestAccountGroup(tenant.id, account.id);

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: accountGroup.id,
				name: "Updated Account Group Name",
				description: "Updated Test Desc",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(account_group_table)
			.where(eq(account_group_table.id, body.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].name).toBe("Updated Account Group Name");
		expect(inDb[0].description).toBe("Updated Test Desc");
	});

	test("returns 400 when account group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: "non-existent-id",
				name: "Should Fail",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Account group not found");
	});

	test("returns 403 when account lacks manage_settings", async () => {
		const { account, cookie, tenant, csrfToken } = await setTestSession();
		const accountGroup = await createTestAccountGroup(tenant.id, account.id);

		// Downgrade role to MEMBER (no manage_settings)
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

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: accountGroup.id,
				name: "Should Fail",
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to update this account group",
		);
	});

	test("moves group to new parent via update", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create parent A
		const parentAResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Parent A",
				tenant_id: tenant.id,
			}),
		});
		const parentABody =
			(await parentAResponse.json()) as AccountGroupCreateRouteResponse;
		if (parentABody.status !== "ok") throw new Error("unexpected");

		// Create parent B
		const parentBResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Parent B",
				tenant_id: tenant.id,
			}),
		});
		const parentBBody =
			(await parentBResponse.json()) as AccountGroupCreateRouteResponse;
		if (parentBBody.status !== "ok") throw new Error("unexpected");

		// Create child under parent A
		const childResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Child",
				tenant_id: tenant.id,
				parent_group_id: parentABody.payload.id,
			}),
		});
		const childBody =
			(await childResponse.json()) as AccountGroupCreateRouteResponse;
		if (childBody.status !== "ok") throw new Error("unexpected");

		// Move child to parent B
		const updateResponse = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: childBody.payload.id,
				name: "Child",
				parent_group_id: parentBBody.payload.id,
			}),
		});

		expect(updateResponse.status).toBe(200);
		const updateBody =
			(await updateResponse.json()) as AccountGroupUpdateRouteResponse;
		expect(updateBody.status).toBe("ok");
		if (updateBody.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(account_group_table)
			.where(eq(account_group_table.id, childBody.payload.id));
		expect(inDb[0].parent_group_id).toBe(parentBBody.payload.id);
	});

	test("rejects circular hierarchy (direct cycle)", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create a group
		const groupResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Group",
				tenant_id: tenant.id,
			}),
		});
		const groupBody =
			(await groupResponse.json()) as AccountGroupCreateRouteResponse;
		if (groupBody.status !== "ok") throw new Error("unexpected");

		// Try to set itself as parent
		const updateResponse = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: groupBody.payload.id,
				name: "Group",
				parent_group_id: groupBody.payload.id,
			}),
		});

		expect(updateResponse.status).toBe(400);
		const updateBody =
			(await updateResponse.json()) as AccountGroupUpdateRouteResponse;
		expect(updateBody.status).toBe("error");
		expect(updateBody.errors?.global).toContain("circular hierarchy");
	});

	test("rejects circular hierarchy (indirect cycle)", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create grandparent -> parent -> child hierarchy
		const grandparentResponse = await app.request(
			ACCOUNT_GROUP_CREATE_ROUTE.path,
			{
				method: "POST",
				headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					name: "Grandparent",
					tenant_id: tenant.id,
				}),
			},
		);
		const grandparentBody =
			(await grandparentResponse.json()) as AccountGroupCreateRouteResponse;
		if (grandparentBody.status !== "ok") throw new Error("unexpected");

		const parentResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Parent",
				tenant_id: tenant.id,
				parent_group_id: grandparentBody.payload.id,
			}),
		});
		const parentBody =
			(await parentResponse.json()) as AccountGroupCreateRouteResponse;
		if (parentBody.status !== "ok") throw new Error("unexpected");

		const childResponse = await app.request(ACCOUNT_GROUP_CREATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Child",
				tenant_id: tenant.id,
				parent_group_id: parentBody.payload.id,
			}),
		});
		const childBody =
			(await childResponse.json()) as AccountGroupCreateRouteResponse;
		if (childBody.status !== "ok") throw new Error("unexpected");

		// Try to make grandparent a child of child (creates cycle)
		const updateResponse = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE.path, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: grandparentBody.payload.id,
				name: "Grandparent",
				parent_group_id: childBody.payload.id,
			}),
		});

		expect(updateResponse.status).toBe(400);
		const updateBody =
			(await updateResponse.json()) as AccountGroupUpdateRouteResponse;
		expect(updateBody.status).toBe("error");
		expect(updateBody.errors?.global).toContain("circular hierarchy");
	});
});
