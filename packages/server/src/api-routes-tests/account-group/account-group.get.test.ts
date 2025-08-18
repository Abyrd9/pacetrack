import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GROUP_GET_ROUTE_PATH,
	type AccountGroupGetRouteResponse,
	account_group_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";

import { createTestAccount } from "src/utils/test-helpers/create-test-account";
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

describe("Account Group Get Route", () => {
	test("returns account account groups with pagination (scope=account)", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		const totalAccountGroups = 15;
		for (let i = 0; i < totalAccountGroups; i++) {
			await createTestAccountGroup(tenant.id, account.id, `Account Team ${i}`);
		}

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "account", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Data assertions
		expect(body.payload.accountGroups).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalAccountGroups);
		expect(body.payload.pagination?.page).toBe(1);
		expect(body.payload.pagination?.perPage).toBe(10);
		expect(body.payload.pagination?.totalPages).toBe(
			Math.ceil(totalAccountGroups / 10),
		);
	});

	test("returns tenant account groups with pagination (scope=tenant)", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		// Account's own account groups
		for (let i = 0; i < 5; i++) {
			await createTestAccountGroup(
				tenant.id,
				account.id,
				`Tenant Team (self) ${i}`,
			);
		}

		// Account groups created by another account
		const { account: anotherAccount } = await createTestAccount(
			tenant.id,
			"anotherAccount@test.com",
		);
		for (let i = 0; i < 8; i++) {
			await createTestAccountGroup(
				tenant.id,
				anotherAccount.id,
				`Tenant Team (other) ${i}`,
			);
		}

		const totalTenantAccountGroups = 13; // 5 + 8

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "tenant", page: 1, perPage: 10 }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.accountGroups).toHaveLength(10);
		expect(body.payload.pagination?.total).toBe(totalTenantAccountGroups);
	});

	test("excludes soft-deleted account groups", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		const activeAccountGroup = await createTestAccountGroup(
			tenant.id,
			account.id,
			"Active Team",
		);
		const deletedAccountGroup = await createTestAccountGroup(
			tenant.id,
			account.id,
			"Soft Deleted Team",
		);

		// Soft delete the account group
		await db
			.update(account_group_table)
			.set({ deleted_at: new Date() })
			.where(eq(account_group_table.id, deletedAccountGroup.id));

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "account" }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		const ids = body.payload.accountGroups.map((t) => t.id);
		expect(ids).toContain(activeAccountGroup.id);
		expect(ids).not.toContain(deletedAccountGroup.id);
	});

	// Pagination specific cases
	test("Pagination - first page", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		for (let i = 0; i < 12; i++) {
			await createTestAccountGroup(tenant.id, account.id, `Paginate Team ${i}`);
		}

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "account", page: 1, perPage: 5 }),
		});

		const body = (await response.json()) as AccountGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.accountGroups).toHaveLength(5);
		expect(body.payload.pagination?.page).toBe(1);
	});

	test("Pagination - middle page", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		const totalAccountGroups = 23;
		for (let i = 0; i < totalAccountGroups; i++) {
			await createTestAccountGroup(
				tenant.id,
				account.id,
				`Middle Page Team ${i}`,
			);
		}

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "account", page: 2, perPage: 10 }),
		});

		const body = (await response.json()) as AccountGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		expect(body.payload.accountGroups).toHaveLength(10);
		expect(body.payload.pagination?.page).toBe(2);
	});

	test("Pagination - page beyond total pages", async () => {
		await resetDb();
		const { cookie, tenant, account, csrfToken } = await setTestSession();

		const totalAccountGroups = 9;
		for (let i = 0; i < totalAccountGroups; i++) {
			await createTestAccountGroup(
				tenant.id,
				account.id,
				`Beyond Page Team ${i}`,
			);
		}

		const response = await app.request(ACCOUNT_GROUP_GET_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ scope: "account", page: 5, perPage: 10 }),
		});

		const body = (await response.json()) as AccountGroupGetRouteResponse;
		if (body.status !== "ok") throw new Error("unexpected");
		// Expect empty array but still success
		expect(body.payload.accountGroups).toHaveLength(0);
		expect(body.payload.pagination?.total).toBe(totalAccountGroups);
		expect(body.payload.pagination?.page).toBe(5);
	});
});
