import {
	ACCOUNT_SWITCH_ROUTE_PATH,
	account_table,
	tenant_table,
	users_to_tenants_table,
	type AccountSwitchRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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

describe("Account Switch Route", () => {
	test("detaches tenant into a brand-new account (targetAccountId = null)", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(ACCOUNT_SWITCH_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenantId: tenant.id, targetAccountId: null }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountSwitchRouteResponse;
		expect(body.status).toBe("ok");

		// Verify tenant now has a new account
		const updatedTenant = await db.query.tenant_table.findFirst({
			where: eq(tenant_table.id, tenant.id),
		});
		expect(updatedTenant?.account_id).not.toBe(tenant.account_id);
	});

	test("switches tenant to an existing account where user has permission", async () => {
		const { cookie, csrfToken, tenant, user } = await setTestSession();

		// Create a second account
		const [targetAccount] = await db
			.insert(account_table)
			.values({
				created_by: user.id,
				customer_id: "cus_target",
				subscription_id: "sub_target",
			})
			.returning();

		// Create a tenant in the target account and associate the user with it
		const [targetTenant] = await db
			.insert(tenant_table)
			.values({
				name: "Target Tenant",
				account_id: targetAccount.id,
				created_by: user.id,
				kind: "org",
			})
			.returning();

		// Get the owner role
		const ownerRole = await db.query.role_table.findFirst({
			where: (role, { eq }) => eq(role.kind, "owner"),
		});
		if (!ownerRole) throw new Error("Owner role not found");

		// Associate user with the target tenant with owner role (has manage_billing)
		await db.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: targetTenant.id,
			role_id: ownerRole.id,
			is_primary_contact: true,
			is_billing_contact: true,
		});

		const response = await app.request(ACCOUNT_SWITCH_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				tenantId: tenant.id,
				targetAccountId: targetAccount.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountSwitchRouteResponse;
		expect(body.status).toBe("ok");

		// Verify tenant now belongs to target account
		const updatedTenant = await db.query.tenant_table.findFirst({
			where: eq(tenant_table.id, tenant.id),
		});
		expect(updatedTenant?.account_id).toBe(targetAccount.id);
	});
});
