import {
	USER_GET_BY_ID_ROUTE_PATH,
	user_table,
	type UserGetByIdRouteResponse,
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

describe("User Get By ID Route", () => {
	test("returns user when user exists in tenant", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();
		const targetUser = await createTestUser(tenant.id);

		const response = await app.request(USER_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: targetUser.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGetByIdRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.id).toBe(targetUser.id);
		expect(body.payload.email).toBe(targetUser.email);
	});

	test("returns 400 when user does not exist", async () => {
		await resetDb();
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: "non-existent-user-id",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User not found");
	});

	test("returns 400 when user is soft deleted", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();
		const targetUser = await createTestUser(tenant.id);

		// Soft delete the user
		await db
			.update(user_table)
			.set({ deleted_at: sql`now()` })
			.where(eq(user_table.id, targetUser.id));

		const response = await app.request(USER_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: targetUser.id,
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User not found");
	});
});
