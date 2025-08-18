import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GET_ROUTE_PATH,
	type AccountGetRouteResponse,
	account_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
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

describe("Account Get Route", () => {
	test("returns accounts in tenant with pagination", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create additional accounts for the same user
		const totalAccounts = 15;
		for (let i = 0; i < totalAccounts - 1; i++) {
			await createTestAccount({
				tenantId: tenant.id,
				email: `account${i}@test.com`,
				existingUserId: user.id,
			});
		}

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalAccounts);
		expect(body.payload.pagination?.page).toBe(1);
		expect(body.payload.pagination?.perPage).toBe(10);
		expect(body.payload.pagination?.totalPages).toBe(
			Math.ceil(totalAccounts / 10),
		);
	});

	test("returns accounts without pagination when page/perPage not provided", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create a few accounts for the same user
		await createTestAccount({
			tenantId: tenant.id,
			email: "account1@test.com",
			existingUserId: user.id,
		});
		await createTestAccount({
			tenantId: tenant.id,
			email: "account2@test.com",
			existingUserId: user.id,
		});

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accounts).toHaveLength(3); // 2 created + 1 from session
		expect(body.payload.pagination).toBeUndefined();
	});

	test("excludes soft-deleted accounts", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		const { account: activeAccount } = await createTestAccount({
			tenantId: tenant.id,
			email: "active@test.com",
			existingUserId: user.id,
		});
		const { account: deletedAccount } = await createTestAccount({
			tenantId: tenant.id,
			email: "deleted@test.com",
			existingUserId: user.id,
		});

		// Soft delete one account
		await db
			.update(account_table)
			.set({ deleted_at: sql`now()` })
			.where(eq(account_table.id, deletedAccount.id));

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		const accountIds = body.payload.accounts.map((a) => a.id);
		expect(accountIds).toContain(activeAccount.id);
		expect(accountIds).not.toContain(deletedAccount.id);
	});

	test("handles pagination - first page", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		for (let i = 0; i < 12; i++) {
			await createTestAccount({
				tenantId: tenant.id,
				email: `paginate${i}@test.com`,
				existingUserId: user.id,
			});
		}

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 1, perPage: 5 }),
		});

		const body = (await response.json()) as AccountGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.accounts).toHaveLength(5);
		expect(body.payload.pagination?.page).toBe(1);
	});

	test("handles pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		for (let i = 0; i < 9; i++) {
			await createTestAccount({
				tenantId: tenant.id,
				email: `beyond${i}@test.com`,
				existingUserId: user.id,
			});
		}

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as AccountGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.accounts).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(10); // 9 created + 1 from session
		expect(body.payload.pagination?.page).toBe(5);
	});

	// New test to verify a user can have multiple accounts
	test("user can have multiple accounts", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create a second account for the same user
		await createTestAccount({
			tenantId: tenant.id,
			email: "second@test.com",
			existingUserId: user.id, // Link to same user
		});

		// Create a third account for the same user
		await createTestAccount({
			tenantId: tenant.id,
			email: "third@test.com",
			existingUserId: user.id, // Link to same user
		});

		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Should have 3 accounts: original from session + 2 created
		expect(body.payload.accounts).toHaveLength(3);

		// All accounts should belong to the same user
		const userIds = body.payload.accounts.map((a) => a.user_id);
		expect(userIds.every((id) => id === user.id)).toBe(true);

		// Each account should have a different email
		const emails = body.payload.accounts.map((a) => a.email);
		expect(new Set(emails)).toHaveProperty("size", 3);
		expect(emails).toContain("second@test.com");
		expect(emails).toContain("third@test.com");
	});
});
