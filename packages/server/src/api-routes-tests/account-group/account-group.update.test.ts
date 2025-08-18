import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
	type AccountGroupUpdateRouteResponse,
	account_group_table,
	account_to_account_group_table,
	account_to_tenant_table,
	DEFAULT_ROLES,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
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

describe("Account Group Update Route", () => {
	test("updates account group when account has manage_settings", async () => {
		const { cookie, tenant, account, csrfToken } = await setTestSession();
		const accountGroup = await createTestAccountGroup(tenant.id, account.id);

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: accountGroup.id,
				name: "Updated Account Group Name",
				description: "Updated Test Desc",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		// Verify DB
		const inDb = await db
			.select()
			.from(account_group_table)
			.where(eq(account_group_table.id, body.payload.id));
		expect(inDb).toHaveLength(1);
		expect(inDb[0].name).toBe("Updated Account Group Name");
		expect(inDb[0].description).toBe("Updated Test Desc");
	});

	test("returns 400 when account group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: "non-existent-id",
				name: "Should Fail",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Account group not found");
	});

	test("returns 403 when account lacks manage_settings", async () => {
		const { account, cookie, tenant, csrfToken } = await setTestSession();
		const accountGroup = await createTestAccountGroup(tenant.id, account.id);

		// Downgrade role to MEMBER (no manage_settings)
		const [basicRole] = await db
			.insert(role_table)
			.values({
				name: "Basic",
				kind: "member",
				allowed: DEFAULT_ROLES.MEMBER.allowed,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db
			.update(account_to_tenant_table)
			.set({ role_id: basicRole.id })
			.where(
				and(
					eq(account_to_tenant_table.account_id, account.id),
					eq(account_to_tenant_table.tenant_id, tenant.id),
				),
			);

		const response = await app.request(ACCOUNT_GROUP_UPDATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				id: accountGroup.id,
				name: "Should Fail",
			}),
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as AccountGroupUpdateRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe(
			"You are not authorized to update this account group",
		);
	});
});
