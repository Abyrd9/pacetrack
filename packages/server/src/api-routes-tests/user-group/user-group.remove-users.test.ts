import {
	DEFAULT_ROLES,
	USER_GROUP_REMOVE_USERS_ROUTE_PATH,
	role_table,
	user_group_table,
	users_to_tenants_table,
	users_to_user_groups_table,
	type UserGroupRemoveUsersRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { createTestUser } from "src/utils/test-helpers/create-test-user";
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

describe("User Group Remove Users Route", () => {
	test("removes users from a user group when user has manage_users permission", async () => {
		const { cookie, tenant, user, csrfToken } = await setTestSession();
		const userToRemove = await createTestUser(tenant.id, "test2@test.com");

		const [userGroup] = await db
			.insert(user_group_table)
			.values({
				name: "Test User Group",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db.insert(users_to_user_groups_table).values([
			{ user_id: user.id, user_group_id: userGroup.id },
			{ user_id: userToRemove.id, user_group_id: userGroup.id },
		]);

		const response = await app.request(USER_GROUP_REMOVE_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: [userToRemove.id],
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupRemoveUsersRouteResponse;
		expect(body.status).toBe("ok");

		const usersInTeam = await db
			.select()
			.from(users_to_user_groups_table)
			.where(eq(users_to_user_groups_table.user_group_id, userGroup.id));
		expect(usersInTeam).toHaveLength(1);
		expect(usersInTeam[0].user_id).toBe(user.id);
	});

	test("returns 403 when user lacks manage_users permission", async () => {
		const { cookie, tenant, user, csrfToken } = await setTestSession();
		const userToRemove = await createTestUser(tenant.id, "test3@test.com");

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

		const [userGroup] = await db
			.insert(user_group_table)
			.values({
				name: "Test User Group",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db.insert(users_to_user_groups_table).values({
			user_id: userToRemove.id,
			user_group_id: userGroup.id,
		});

		const response = await app.request(USER_GROUP_REMOVE_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: [userToRemove.id],
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as UserGroupRemoveUsersRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("You are not authorized to remove users");
	});

	test("returns 400 if team does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_GROUP_REMOVE_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: "non-existent-user-group-id",
				userIds: ["some-user-id"],
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGroupRemoveUsersRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User group not found");
	});

	test("does not fail if users to be removed are not in the team", async () => {
		const { cookie, tenant, csrfToken } = await setTestSession();

		const [userGroup] = await db
			.insert(user_group_table)
			.values({
				name: "Test User Group",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const response = await app.request(USER_GROUP_REMOVE_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: ["non-existent-user-id"],
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupRemoveUsersRouteResponse;
		expect(body.status).toBe("ok");
	});
});
