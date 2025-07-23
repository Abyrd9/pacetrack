import {
	USER_GET_ROUTE_PATH,
	user_table,
	type UserGetRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
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

describe("User Get Route", () => {
	test("returns users in tenant with pagination", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create additional users
		const totalUsers = 15;
		for (let i = 0; i < totalUsers - 1; i++) {
			await createTestUser(tenant.id, `user${i}@test.com`);
		}

		const response = await app.request(USER_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalUsers);
		expect(body.payload.pagination?.page).toBe(1);
		expect(body.payload.pagination?.perPage).toBe(10);
		expect(body.payload.pagination?.totalPages).toBe(
			Math.ceil(totalUsers / 10),
		);
	});

	test("returns users without pagination when page/perPage not provided", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create a few users
		await createTestUser(tenant.id, "user1@test.com");
		await createTestUser(tenant.id, "user2@test.com");

		const response = await app.request(USER_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(3); // 2 created + 1 from session
		expect(body.payload.pagination).toBeUndefined();
	});

	test("excludes soft-deleted users", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		const activeUser = await createTestUser(tenant.id, "active@test.com");
		const deletedUser = await createTestUser(tenant.id, "deleted@test.com");

		// Soft delete one user
		await db
			.update(user_table)
			.set({ deleted_at: sql`now()` })
			.where(eq(user_table.id, deletedUser.id));

		const response = await app.request(USER_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		const userIds = body.payload.users.map((u) => u.id);
		expect(userIds).toContain(activeUser.id);
		expect(userIds).not.toContain(deletedUser.id);
	});

	test("handles pagination - first page", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		for (let i = 0; i < 12; i++) {
			await createTestUser(tenant.id, `paginate${i}@test.com`);
		}

		const response = await app.request(USER_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 1, perPage: 5 }),
		});

		const body = (await response.json()) as UserGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.users).toHaveLength(5);
		expect(body.payload.pagination?.page).toBe(1);
	});

	test("handles pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		for (let i = 0; i < 9; i++) {
			await createTestUser(tenant.id, `beyond${i}@test.com`);
		}

		const response = await app.request(USER_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as UserGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.users).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(10); // 9 created + 1 from session
		expect(body.payload.pagination?.page).toBe(5);
	});
});
