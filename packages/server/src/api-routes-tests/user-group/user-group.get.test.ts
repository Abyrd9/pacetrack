import {
	USER_GROUP_GET_ROUTE_PATH,
	user_group_table,
	type UserGroupGetRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

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

describe("User Group Get Route", () => {
	test("returns user user groups with pagination (scope=user)", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		const totalUserGroups = 15;
		for (let i = 0; i < totalUserGroups; i++) {
			await createTestUserGroup(tenant.id, user.id, `User Team ${i}`);
		}

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "user", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Data assertions
		expect(body.payload.userGroups).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalUserGroups);
		expect(body.payload.pagination?.page).toBe(1);
		expect(body.payload.pagination?.perPage).toBe(10);
		expect(body.payload.pagination?.totalPages).toBe(
			Math.ceil(totalUserGroups / 10),
		);
	});

	test("returns tenant user groups with pagination (scope=tenant)", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		// User's own user groups
		for (let i = 0; i < 5; i++) {
			await createTestUserGroup(tenant.id, user.id, `Tenant Team (self) ${i}`);
		}

		// User groups created by another user
		const anotherUser = await createTestUser(tenant.id, "anotherUser@test.com");
		for (let i = 0; i < 8; i++) {
			await createTestUserGroup(
				tenant.id,
				anotherUser.id,
				`Tenant Team (other) ${i}`,
			);
		}

		const totalTenantUserGroups = 13; // 5 + 8

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "tenant", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.userGroups).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalTenantUserGroups);
	});

	test("excludes soft-deleted user groups", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		const activeUserGroup = await createTestUserGroup(
			tenant.id,
			user.id,
			"Active Team",
		);
		const deletedUserGroup = await createTestUserGroup(
			tenant.id,
			user.id,
			"Soft Deleted Team",
		);

		// Soft delete the user group
		await db
			.update(user_group_table)
			.set({ deleted_at: new Date() })
			.where(eq(user_group_table.id, deletedUserGroup.id));

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "user" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		const ids = body.payload.userGroups.map((t) => t.id);
		expect(ids).toContain(activeUserGroup.id);
		expect(ids).not.toContain(deletedUserGroup.id);
	});

	// Pagination specific cases
	test("Pagination - first page", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		for (let i = 0; i < 12; i++) {
			await createTestUserGroup(tenant.id, user.id, `Paginate Team ${i}`);
		}

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "user", page: 1, perPage: 5 }),
		});

		const body = (await response.json()) as UserGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.userGroups).toHaveLength(5);
		expect(body.payload.pagination?.page).toBe(1);
	});

	test("Pagination - middle page", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		const totalUserGroups = 23;
		for (let i = 0; i < totalUserGroups; i++) {
			await createTestUserGroup(tenant.id, user.id, `Middle Page Team ${i}`);
		}

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "user", page: 2, perPage: 10 }),
		});

		const body = (await response.json()) as UserGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.userGroups).toHaveLength(10);
		expect(body.payload.pagination?.page).toBe(2);
	});

	test("Pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, tenant, user, csrfToken } = await setTestSession();

		const totalUserGroups = 9;
		for (let i = 0; i < totalUserGroups; i++) {
			await createTestUserGroup(tenant.id, user.id, `Beyond Page Team ${i}`);
		}

		const response = await app.request(USER_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "user", page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as UserGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		// Expect empty array but still success
		expect(body.payload.userGroups).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(totalUserGroups);
		expect(body.payload.pagination?.page).toBe(5);
	});
});
