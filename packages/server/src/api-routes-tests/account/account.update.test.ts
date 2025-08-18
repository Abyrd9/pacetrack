import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_UPDATE_ROUTE_PATH,
	type AccountUpdateRouteResponse,
	account_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
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

describe("Account Update Route", () => {
	test("updates user display_name when user updates own profile", async () => {
		await resetDb();
		const { cookie, account, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: account.id,
				display_name: "Updated Name",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountUpdateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.display_name).toBe("Updated Name");

		// Verify in DB
		const updatedUser = await db
			.select()
			.from(account_table)
			.where(eq(account_table.id, account.id));
		expect(updatedUser[0].display_name).toBe("Updated Name");
	});

	test("returns 403 when user tries to update another user's profile", async () => {
		await resetDb();
		const { cookie, tenant, csrfToken } = await setTestSession();
		const { user: otherUser } = await createTestAccount({
			tenantId: tenant.id,
		});

		const response = await app.request(ACCOUNT_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: otherUser.id,
				display_name: "Should Fail",
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as AccountUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to update this account",
		);
	});

	test("returns 403 when trying to update non-existent user", async () => {
		await resetDb();
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: "non-existent-user-id",
				display_name: "Should Fail",
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as AccountUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to update this account",
		);
	});
});
