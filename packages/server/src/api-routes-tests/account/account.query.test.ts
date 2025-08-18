import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_QUERY_ROUTE_PATH,
	type AccountQueryRouteResponse,
} from "@pacetrack/schema";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
	await resetDb();
});

describe("Account Query Route", () => {
	test("searches accounts by email term with pagination", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create accounts with "example" in email
		await createTestAccount({
			tenantId: tenant.id,
			email: "example1@test.com",
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "example2@test.com",
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "other@test.com",
		});

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "example", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(2);
		expect(
			body.payload.accounts.every((a) => a.email.includes("example")),
		).toBe(true);
		expect(body.payload.pagination?.total).toBe(2);
	});

	test("searches accounts by account display_name term", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create accounts with specific account display names
		const { account: account1 } = await createTestAccount({
			tenantId: tenant.id,
			email: "user1@test.com",
			displayName: "Developer John",
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "user2@test.com",
			displayName: "Designer Jane",
		});

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "Developer" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(1);
		expect(body.payload.accounts[0].email).toBe("user1@test.com");
		// Verify the account has the matching display name
		expect(body.payload.accounts[0].id).toBe(account1.id);
	});

	test("handles case-insensitive search", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		await createTestAccount({
			tenantId: tenant.id,
			email: "search@test.com",
			displayName: "Search User",
		});

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "search" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(1);
		expect(body.payload.accounts[0].email).toBe("search@test.com");
	});

	test("returns empty results when no matches found", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		await createTestAccount({
			tenantId: tenant.id,
			email: "existing@test.com",
		});

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "nonexistent", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(0);
	});

	test("handles pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();

		// Create accounts with "match" in email
		for (let i = 0; i < 5; i++) {
			await createTestAccount({
				tenantId: tenant.id,
				email: `match${i}@test.com`,
			});
		}

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "match", page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as AccountQueryRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.accounts).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(5);
		expect(body.payload.pagination?.page).toBe(5);
	});

	test("finds multiple accounts for same user", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create multiple accounts for the same user with searchable terms
		await createTestAccount({
			tenantId: tenant.id,
			email: "search1@example.com",
			existingUserId: user.id,
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "search2@example.com",
			existingUserId: user.id,
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "other@test.com",
		});

		const response = await app.request(ACCOUNT_QUERY_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ term: "example" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountQueryRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Should find both accounts with "example" in email
		expect(body.payload.accounts).toHaveLength(2);
		expect(
			body.payload.accounts.every((a) => a.email.includes("example")),
		).toBe(true);

		// Both accounts should belong to the same user
		const userIds = body.payload.accounts.map((a) => a.user_id);
		expect(userIds.every((id) => id === user.id)).toBe(true);

		// Verify specific emails are found
		const emails = body.payload.accounts.map((a) => a.email);
		expect(emails).toContain("search1@example.com");
		expect(emails).toContain("search2@example.com");
	});
});
