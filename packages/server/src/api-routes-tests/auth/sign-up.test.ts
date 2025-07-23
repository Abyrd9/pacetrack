import {
	DEFAULT_ROLES,
	SIGN_UP_ROUTE_PATH,
	type SignUpRouteResponse,
} from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
	await resetDb();
});

describe("Sign Up Route", () => {
	test("should return 400 if email is not provided", async () => {
		const form = new FormData();
		form.append("password", "password");
		form.append("passwordConfirmation", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.email).toBeDefined();
	});

	test("should return 400 if password is not provided", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("passwordConfirmation", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.password).toBeDefined();
	});

	test("should return 400 if password confirmation is not provided", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("password", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.passwordConfirmation).toBeDefined();
	});

	test("should return 400 if password and password confirmation do not match", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("password", "password");
		form.append("passwordConfirmation", "password2");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.passwordConfirmation).toBeDefined();
	});

	test("should return 400 if email is not valid", async () => {
		const form = new FormData();
		form.append("email", "test");
		form.append("password", "password");
		form.append("passwordConfirmation", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.email).toBeDefined();
	});

	test("Should return 400 if password is less than 8 characters", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("password", "pass");
		form.append("passwordConfirmation", "pass");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.password).toBeDefined();
	});

	test("Should return 200 if user is created", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("password", "password");
		form.append("passwordConfirmation", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("ok");
		expect(body.payload).toBeDefined();
		expect(body.payload?.accountId).toBeDefined();
		expect(body.payload?.user.email).toBe("test@test.com");
		expect(body.payload?.csrfToken).toBeDefined(); // Verify CSRF token is returned
	});

	test("should return 400 if email is already in use", async () => {
		const form = new FormData();
		form.append("email", "test@test.com");
		form.append("password", "password");
		form.append("passwordConfirmation", "password");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignUpRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.form).toEqual("User already exists");
	});

	// Add new test for successful signup with tenant and stripe creation
	test("Should create account, tenant, role, and stripe subscription on successful signup", async () => {
		const form = new FormData();
		form.append("email", "new@test.com");
		form.append("password", "password123");
		form.append("passwordConfirmation", "password123");

		const response = await app.request(SIGN_UP_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as SignUpRouteResponse;
		expect(body.status).toBe("ok");
		expect(body.payload?.csrfToken).toBeDefined(); // Verify CSRF token is returned

		// Verify user was created
		const user = await db.query.user_table.findFirst({
			where: (users, { eq }) => eq(users.email, "new@test.com"),
		});
		expect(user).toBeDefined();

		const getTenantAndRole = await db.query.users_to_tenants_table.findFirst({
			where: (users_to_tenants, { eq }) =>
				eq(users_to_tenants.user_id, user?.id ?? ""),
		});
		expect(getTenantAndRole).toBeDefined();
		expect(getTenantAndRole?.tenant_id).toBeDefined();
		expect(getTenantAndRole?.role_id).toBeDefined();

		// Verify tenant was created
		const tenant = await db.query.tenant_table.findFirst({
			where: (tenants, { eq }) =>
				eq(tenants.id, getTenantAndRole?.tenant_id ?? ""),
		});
		expect(tenant).toBeDefined();
		expect(tenant?.name).toBe("Personal");

		// Verify role was created
		const role = await db.query.role_table.findFirst({
			where: (roles, { eq }) => eq(roles.id, getTenantAndRole?.role_id ?? ""),
		});
		expect(role).toBeDefined();
		expect(role?.allowed).toEqual(DEFAULT_ROLES.OWNER.allowed);

		// Verify account was created with stripe customer
		const account = await db.query.account_table.findFirst({
			where: (accounts, { eq, and }) =>
				and(
					eq(accounts.created_by, user?.id ?? ""),
					eq(accounts.id, tenant?.account_id ?? ""),
				),
		});
		expect(account).toBeDefined();
		expect(account?.customer_id).toBeDefined();
		expect(account?.subscription_id).toBeDefined();
	});
});
