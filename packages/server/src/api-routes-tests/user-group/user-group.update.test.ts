import {
	DEFAULT_ROLES,
	USER_GROUP_UPDATE_ROUTE_PATH,
	role_table,
	user_group_table,
	users_to_tenants_table,
	type UserGroupUpdateRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { createTestUserGroup } from "src/utils/test-helpers/create-test-user-group";
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

describe("User Group Update Route", () => {
	test("updates user group when user has manage_settings", async () => {
		const { cookie, tenant, user, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(tenant.id, user.id);

		const response = await app.request(USER_GROUP_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: userGroup.id,
				name: "Updated User Group Name",
				description: "Updated Test Desc",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupUpdateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(user_group_table)
			.where(eq(user_group_table.id, body.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].name).toBe("Updated User Group Name");
		expect(inDb[0].description).toBe("Updated Test Desc");
	});

	test("returns 400 when user group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_GROUP_UPDATE_ROUTE_PATH, {
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
		const body = (await response.json()) as UserGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User group not found");
	});

	test("returns 403 when user lacks manage_settings", async () => {
		const { user, cookie, tenant, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(tenant.id, user.id);

		// Downgrade role to USER (no manage_settings)
		const [basicRole] = await db
			.insert(role_table)
			.values({
				name: "Basic",
				kind: "user",
				allowed: DEFAULT_ROLES.USER.allowed,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db
			.update(users_to_tenants_table)
			.set({ role_id: basicRole.id })
			.where(
				and(
					eq(users_to_tenants_table.user_id, user.id),
					eq(users_to_tenants_table.tenant_id, tenant.id),
				),
			);

		const response = await app.request(USER_GROUP_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: userGroup.id,
				name: "Should Fail",
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as UserGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to update this user group",
		);
	});
});
