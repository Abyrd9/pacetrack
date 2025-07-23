import {
	DEFAULT_ROLES,
	USER_GROUP_DELETE_ROUTE_PATH,
	role_table,
	user_group_table,
	users_to_tenants_table,
	type UserGroupDeleteRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
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

describe("User Group Delete Route", () => {
	test("deletes user group when user has manage_settings", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create a user group to delete
		const [userGroup] = await db
			.insert(user_group_table)
			.values({
				name: "User Group to Delete",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const response = await app.request(USER_GROUP_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupDeleteRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(user_group_table)
			.where(eq(user_group_table.id, userGroup.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].deleted_at).not.toBeNull();
	});

	test("returns 400 when user group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_GROUP_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: "non-existent-id",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGroupDeleteRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User group not found");
	});

	test("returns 403 when user lacks manage_settings", async () => {
		const { user, cookie, csrfToken, tenant } = await setTestSession();

		// Create a user group to delete
		const [userGroup] = await db
			.insert(user_group_table)
			.values({
				name: "Protected User Group",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

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

		const response = await app.request(USER_GROUP_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as UserGroupDeleteRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to delete this user group",
		);
	});
});
