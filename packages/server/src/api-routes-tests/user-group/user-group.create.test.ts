import {
	DEFAULT_ROLES,
	USER_GROUP_CREATE_ROUTE_PATH,
	role_table,
	user_group_table,
	users_to_tenants_table,
	type UserGroupCreateRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
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

describe("User Group Create Route", () => {
	test("creates user group when user has manage_roles", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(USER_GROUP_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "My User Group",
				description: "Test Desc",
				tenant_id: tenant.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupCreateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(user_group_table)
			.where(eq(user_group_table.id, body.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].tenant_id).toBe(tenant.id);
	});

	test("returns 403 when user lacks manage_roles", async () => {
		const { user, cookie, csrfToken, tenant } = await setTestSession();

		// Downgrade role to USER (no manage_roles)
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

		const response = await app.request(USER_GROUP_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				name: "Should Fail",
				tenant_id: tenant.id,
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as UserGroupCreateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to create user groups",
		);
	});
});
