import {
	USER_GROUP_GET_BY_ID_ROUTE_PATH,
	type UserGroupGetByIdRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { createTestUserGroup } from "src/utils/test-helpers/create-test-user-group";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
	makeAuthenticatedRequest,
	setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";

beforeAll(async () => {
	await resetDb();
});

describe("User Group Get By Id Route", () => {
	test("returns user group when user has permission", async () => {
		const { cookie, user, tenant, csrfToken } = await setTestSession();
		const userGroup = await createTestUserGroup(tenant.id, user.id);

		const response = await app.request(USER_GROUP_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({ userGroupId: userGroup.id }),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserGroupGetByIdRouteResponse;
		expect(body.status).toBe("ok");
		if (body.status !== "ok") throw new Error("unexpected");

		expect(body.payload.id).toBe(userGroup.id);
		expect(body.payload.name).toBe(userGroup.name);
	});

	test("returns 400 when user group does not exist", async () => {
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_GROUP_GET_BY_ID_ROUTE_PATH, {
			method: "POST",
			body: JSON.stringify({ userGroupId: "non-existent-id" }),
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserGroupGetByIdRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User group not found");
	});
});
