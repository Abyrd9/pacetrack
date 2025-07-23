import {
	ACCOUNT_CREATE_ROUTE_PATH,
	tenant_table,
	type AccountCreateRouteResponse,
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

describe("Account Create Route", () => {
	test("creates a new account and attaches tenant (happy path)", async () => {
		const {
			cookie,
			csrfToken,
			tenant: personalTenant,
		} = await setTestSession();

		const response = await app.request(ACCOUNT_CREATE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ tenantId: personalTenant.id }),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountCreateRouteResponse;
		expect(body.status).toBe("ok");

		// Verify tenant now has a new account
		const updatedTenant = await db.query.tenant_table.findFirst({
			where: eq(tenant_table.id, personalTenant.id),
		});
		expect(updatedTenant?.account_id).not.toBe(personalTenant.account_id);
	});
});
