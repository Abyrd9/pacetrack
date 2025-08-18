import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GET_BY_ID_ROUTE_PATH,
	type AccountGetByIdRouteResponse,
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

describe("Account Get By ID Route", () => {
	test("returns account when account exists in tenant", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();
		const { account: targetAccount } = await createTestAccount({
			tenantId: tenant.id,
			email: "target@test.com",
		});

		const response = await app.request(ACCOUNT_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				accountId: targetAccount.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetByIdRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.id).toBe(targetAccount.id);
		expect(body.payload.email).toBe(targetAccount.email);
	});

	test("returns 400 when account does not exist", async () => {
		await resetDb();
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				accountId: "non-existent-account-id",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Account not found");
	});

	test("returns 400 when account is soft deleted", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();
		const { account: targetAccount } = await createTestAccount({
			tenantId: tenant.id,
			email: "deleted@test.com",
		});

		// Soft delete the account
		await db
			.update(account_table)
			.set({ deleted_at: sql`now()` })
			.where(eq(account_table.id, targetAccount.id));

		const response = await app.request(ACCOUNT_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				accountId: targetAccount.id,
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Account not found");
	});

	// Test getting an account that belongs to same user but different email
	test("can get different accounts for same user", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create another account for the same user
		const { account: secondAccount } = await createTestAccount({
			tenantId: tenant.id,
			email: "second@test.com",
			existingUserId: user.id,
		});

		const response = await app.request(ACCOUNT_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				accountId: secondAccount.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetByIdRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.id).toBe(secondAccount.id);
		expect(body.payload.email).toBe("second@test.com");
		expect(body.payload.user_id).toBe(user.id);
	});
});
