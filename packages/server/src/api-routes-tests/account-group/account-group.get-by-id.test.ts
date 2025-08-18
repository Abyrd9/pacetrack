import { beforeAll, describe, expect, test } from "bun:test";
import {
	ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
	type AccountGroupGetByIdRouteResponse,
} from "@pacetrack/schema";
import { createTestAccountGroup } from "src/utils/test-helpers/create-test-account-group";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
	await resetDb();
});

describe("Account Group Get By Id Route", () => {
	test("returns account group when account has permission", async () => {
		const { cookie, account, tenant, csrfToken } = await setTestSession();
		const accountGroup = await createTestAccountGroup(tenant.id, account.id);

		const response = await app.request(ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({ accountGroupId: accountGroup.id }),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as AccountGroupGetByIdRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.id).toBe(accountGroup.id);
		expect(body.payload.name).toBe(accountGroup.name);
	});

	test("returns 400 when account group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({ accountGroupId: "non-existent-id" }),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as AccountGroupGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("Account group not found");
	});
});
