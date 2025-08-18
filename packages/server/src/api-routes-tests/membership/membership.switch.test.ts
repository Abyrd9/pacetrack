import { beforeAll, describe, expect, test } from "bun:test";
import {
	account_to_tenant_table,
	MEMBERSHIP_SWITCH_ROUTE_PATH,
	type MembershipSwitchRouteResponse,
	membership_table,
	tenant_table,
} from "@pacetrack/schema";
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

describe("Membership Switch Route", () => {
	test("detaches tenant into a brand-new membership (targetMembershipId = null)", async () => {
		const { cookie, csrfToken, tenant } = await setTestSession();

		const response = await app.request(MEMBERSHIP_SWITCH_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenantId: tenant.id, targetMembershipId: null }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as MembershipSwitchRouteResponse;
		expect(body.status).toBe("ok");

		// Verify tenant now has a new membership
		const updatedTenant = await db.query.tenant_table.findFirst({
			where: eq(tenant_table.id, tenant.id),
		});
		expect(updatedTenant?.membership_id).not.toBe(tenant.membership_id);
	});

	test("switches tenant to an existing membership where user has permission", async () => {
		const { cookie, csrfToken, tenant, account, user } = await setTestSession();

		// Create a second membership
		const [targetMembership] = await db
			.insert(membership_table)
			.values({
				created_by: user.id,
				customer_id: "cus_target",
				subscription_id: "sub_target",
			})
			.returning();

		// Create a tenant in the target membership and associate the user with it
		const [targetTenant] = await db
			.insert(tenant_table)
			.values({
				name: "Target Tenant",
				membership_id: targetMembership.id,
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
		await db.insert(account_to_tenant_table).values({
			account_id: account.id,
			tenant_id: targetTenant.id,
			role_id: ownerRole.id,
		});

		const response = await app.request(MEMBERSHIP_SWITCH_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				tenantId: tenant.id,
				targetMembershipId: targetMembership.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as MembershipSwitchRouteResponse;
		expect(body.status).toBe("ok");

		// Verify tenant now belongs to target membership
		const updatedTenant = await db.query.tenant_table.findFirst({
			where: eq(tenant_table.id, tenant.id),
		});
		expect(updatedTenant?.membership_id).toBe(targetMembership.id);
	});
});
