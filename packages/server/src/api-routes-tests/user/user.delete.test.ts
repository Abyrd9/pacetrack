import {
	USER_DELETE_ROUTE_PATH,
	user_table,
	type UserDeleteRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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

describe("User Delete Route", () => {
	test("deletes user when current user has manage_users permission", async () => {
		await resetDb();
		const { cookie, csrfToken, tenant } = await setTestSession();
		const userToDelete = await createTestUser(tenant.id, "delete-me@test.com");

		const response = await app.request(USER_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: userToDelete.id,
			}),
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as UserDeleteRouteResponse;
		expect(body.status).toBe("ok");

		// Verify user is soft deleted
		const deletedUser = await db.query.user_table.findFirst({
			where: eq(user_table.id, userToDelete.id),
		});
		expect(deletedUser?.deleted_at).toBeDefined();
	});

	test("returns 400 when trying to delete yourself", async () => {
		await resetDb();
		const { cookie, csrfToken, user } = await setTestSession();

		const response = await app.request(USER_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: user.id,
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserDeleteRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("You cannot delete yourself");
	});

	test("returns 403 when user lacks manage_users permission", async () => {
		await resetDb();
		const {
			cookie,
			csrfToken,
			tenant,
			user: adminUser,
		} = await setTestSession();
		const userToDelete = await createTestUser(
			tenant.id,
			"no-permission@test.com",
		);

		// Create a user without manage_users permission in the same tenant
		const regularUser = await createTestUser(tenant.id, "regular@test.com");

		// Create a session for the regular user manually
		const { sessions } = await import("src/utils/helpers/auth-session");
		const { generateCSRFToken } = await import("src/utils/helpers/csrf");
		const { serializeSigned } = await import("hono/utils/cookie");

		const userRole = await db.query.role_table.findFirst({
			where: (role, { eq }) => eq(role.kind, "user"),
		});
		if (!userRole) throw new Error("User role not found");

		const token = sessions.generateToken();
		const session = await sessions.create({
			userId: regularUser.id,
			tenantId: tenant.id,
			roleId: userRole.id,
			token,
		});

		const csrfToken2 = await generateCSRFToken(token);
		const cookie2 = await serializeSigned(
			"pacetrack-session",
			token,
			Bun.env.SESSION_SECRET || "",
			{
				httpOnly: true,
				sameSite: "Lax",
				expires: new Date(session.expires_at),
				path: "/",
			},
		);

		const response = await app.request(USER_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie2, csrfToken2, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: userToDelete.id,
			}),
		});

		const body = (await response.json()) as UserDeleteRouteResponse;
		expect(response.status).toBe(403);
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("You are not authorized");
	});

	test("returns 400 when target user not found in tenant", async () => {
		await resetDb();
		const { cookie, csrfToken } = await setTestSession();

		const response = await app.request(USER_DELETE_ROUTE_PATH, {
			method: "POST",
			headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				userId: "non-existent-user-id",
			}),
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as UserDeleteRouteResponse;
		expect(body.status).toBe("error");
		expect(body.errors?.global).toBe("User not found in tenant");
	});
});
