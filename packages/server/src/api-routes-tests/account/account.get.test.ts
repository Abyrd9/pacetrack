import {
	ACCOUNT_GET_ROUTE_PATH,
	DEFAULT_ROLES,
	account_table,
	role_table,
	tenant_table,
	users_to_tenants_table,
	type AccountGetRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { setTestSession } from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
	await resetDb();
});

describe("Account Get Route", () => {
	test("returns 401 when not authenticated", async () => {
		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "GET",
		});
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.errors?.global).toBe("Unauthorized");
	});

	test("returns all unique accounts linked to the user (deduped)", async () => {
		// Create initial session and personal tenant/account
		const session = await setTestSession();
		const { user, cookie, account } = session;

		// Add a second tenant under the SAME account
		const [role] = await db
			.insert(role_table)
			.values({
				name: "Manager",
				kind: "tenant_admin",
				allowed: DEFAULT_ROLES.TENANT_ADMIN.allowed,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const [tenant2] = await db
			.insert(tenant_table)
			.values({
				name: "Second Tenant",
				account_id: account.id,
				created_by: user.id,
				kind: "org",
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: tenant2.id,
			role_id: role.id,
			is_primary_contact: false,
			is_billing_contact: false,
			created_at: sql`now()`,
			updated_at: sql`now()`,
		});

		// Create a completely separate account + tenant and link user
		const [account2] = await db
			.insert(account_table)
			.values({
				created_by: user.id,
				customer_id: "cus_new",
				subscription_id: "sub_new",
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const [tenant3] = await db
			.insert(tenant_table)
			.values({
				name: "Third Tenant",
				account_id: account2.id,
				created_by: user.id,
				kind: "org",
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		await db.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: tenant3.id,
			role_id: role.id,
			is_primary_contact: false,
			is_billing_contact: false,
			created_at: sql`now()`,
			updated_at: sql`now()`,
		});

		// Now request account list
		const response = await app.request(ACCOUNT_GET_ROUTE_PATH, {
			method: "GET",
			headers: { Cookie: cookie },
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGetRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("Unexpected error");

		// Should contain exactly 2 accounts (deduped)
		expect(body.payload.accounts).toHaveLength(2);
		const accountIds = body.payload.accounts.map((a) => a.id).sort();
		expect(accountIds).toEqual([account.id, account2.id].sort());
	});
});
