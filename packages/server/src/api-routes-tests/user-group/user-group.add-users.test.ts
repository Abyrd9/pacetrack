import {
	DEFAULT_ROLES,
	USER_GROUP_ADD_USERS_ROUTE_PATH,
	role_table,
	users_to_tenants_table,
	users_to_user_groups_table,
	type UserGroupAddUsersRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { createTestUser } from "src/utils/test-helpers/create-test-user";
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

describe("User Group Add Users Route", () => {
	test("adds users to a user group when user has manage_users permission", async () => {
		const { cookie, tenant, user, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(tenant.id, user.id);
		const user1 = await createTestUser(tenant.id, "user1@test.com");
		const user2 = await createTestUser(tenant.id, "user2@test.com");

		const response = await app.request(USER_GROUP_ADD_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: [user1.id, user2.id],
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupAddUsersRouteResponse;
		expect(body.status).toBe("ok");

		// Verify DB
		const inDb = await db
			.select()
			.from(users_to_user_groups_table)
			.where(eq(users_to_user_groups_table.user_group_id, userGroup.id));
		expect(inDb).toHaveLength(3);
		expect(inDb.map((r) => r.user_id).sort()).toEqual(
			[user.id, user1.id, user2.id].sort(),
		);
	});

	test("returns 400 if user group does not exist", async () => {
		const { cookie, tenant, csrfToken } = await setTestSession();
		const user1 = await createTestUser(tenant.id, "user3@test.com");
		const nonExistentUserGroupId = "a-non-existent-user-group-id";

		const response = await app.request(USER_GROUP_ADD_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: nonExistentUserGroupId,
				userIds: [user1.id],
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGroupAddUsersRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User group not found");
	});

	test("returns 403 when user lacks manage_users permission", async () => {
		const { user, cookie, tenant, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(
			tenant.id,
			user.id,
			"Another Team",
		);
		const userToAdd = await createTestUser(tenant.id, "user4@test.com");

		// Downgrade role to USER (no manage_users)
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

		const response = await app.request(USER_GROUP_ADD_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: [userToAdd.id],
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as UserGroupAddUsersRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("You are not authorized to add users");
	});

	test("does not add duplicate users to the user group", async () => {
		const { cookie, tenant, user, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(
			tenant.id,
			user.id,
			"Duplicate Test Team",
		);
		const user1 = await createTestUser(tenant.id, "user5@test.com");
		const user2 = await createTestUser(tenant.id, "user6@test.com");

		// Pre-add user1 to the user group
		await db.insert(users_to_user_groups_table).values({
			user_group_id: userGroup.id,
			user_id: user1.id,
			created_at: sql`now()`,
			updated_at: sql`now()`,
		});

		const response = await app.request(USER_GROUP_ADD_USERS_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userGroupId: userGroup.id,
				userIds: [user1.id, user2.id],
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupAddUsersRouteResponse;
		expect(body.status).toBe("ok");

		// Verify DB
		const inDb = await db
			.select()
			.from(users_to_user_groups_table)
			.where(eq(users_to_user_groups_table.user_group_id, userGroup.id));
		expect(inDb).toHaveLength(3);
		expect(inDb.map((r) => r.user_id).sort()).toEqual(
			[user.id, user1.id, user2.id].sort(),
		);
	});
});
