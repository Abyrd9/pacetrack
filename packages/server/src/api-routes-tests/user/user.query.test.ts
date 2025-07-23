import {
	USER_QUERY_ROUTE_PATH,
	user_table,
	type UserQueryRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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

describe("User Query Route", () => {
	test("searches users by email term with pagination", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create users with "example" in email
		await createTestUser(tenant.id, "example1@test.com");
		await createTestUser(tenant.id, "example2@test.com");
		await createTestUser(tenant.id, "other@test.com");

		const response = await app.request(USER_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "example", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(2);
		expect(body.payload.users.every((u) => u.email.includes("example"))).toBe(
			true,
		);
		expect(body.payload.pagination?.total).toBe(2);
	});

	test("searches users by display_name term", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create users with specific display names
		const user1 = await createTestUser(tenant.id, "user1@test.com");
		const user2 = await createTestUser(tenant.id, "user2@test.com");

		// Update display names
		await db
			.update(user_table)
			.set({ display_name: "Developer John" })
			.where(eq(user_table.id, user1.id));
		await db
			.update(user_table)
			.set({ display_name: "Designer Jane" })
			.where(eq(user_table.id, user2.id));

		const response = await app.request(USER_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "Developer" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(1);
		expect(body.payload.users[0].display_name).toBe("Developer John");
	});

	test("handles case-insensitive search", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		const user = await createTestUser(tenant.id, "search@test.com");
		await db
			.update(user_table)
			.set({ display_name: "Search User" })
			.where(eq(user_table.id, user.id));

		const response = await app.request(USER_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "search" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(1);
		expect(body.payload.users[0].display_name).toBe("Search User");
	});

	test("returns empty results when no matches found", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		await createTestUser(tenant.id, "existing@test.com");

		const response = await app.request(USER_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "nonexistent", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.users).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(0);
	});

	test("handles pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create users with "match" in email
		for (let i = 0; i < 5; i++) {
			await createTestUser(tenant.id, `match${i}@test.com`);
		}

		const response = await app.request(USER_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "match", page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as UserQueryRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.users).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(5);
		expect(body.payload.pagination?.page).toBe(5);
	});
});
