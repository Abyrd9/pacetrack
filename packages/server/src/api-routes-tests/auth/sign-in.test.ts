import { beforeAll, describe, expect, test } from "bun:test";
import {
	account_table,
	account_to_tenant_table,
	DEFAULT_ROLES,
	membership_table,
	role_table,
	SIGN_IN_ROUTE_PATH,
	type SignInRouteResponse,
	tenant_table,
	user_table,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { resetDb } from "src/utils/test-helpers/reset-db";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
	await resetDb();

	// Create a test user and account for sign-in tests
	const hashedPassword = await Bun.password.hash("password123");

	// Create user (no email/password here)
	const [user] = await db.insert(user_table).values({}).returning();

	// Create account with email/password
	const [account] = await db
		.insert(account_table)
		.values({
			email: "test@example.com",
			password: hashedPassword,
			user_id: user.id,
		})
		.returning();

	// Create membership
	const [membership] = await db
		.insert(membership_table)
		.values({
			created_by: user.id,
			customer_id: "cus_123",
			subscription_id: "sub_123",
		})
		.returning();

	// Create personal tenant linked to membership
	const [tenant] = await db
		.insert(tenant_table)
		.values({
			name: "Personal",
			membership_id: membership.id,
			created_by: user.id,
		})
		.returning();

	// Create the Owner role and associate the account with the tenant
	const [role] = await db
		.insert(role_table)
		.values({
			name: DEFAULT_ROLES.OWNER.name,
			kind: DEFAULT_ROLES.OWNER.kind,
			allowed: DEFAULT_ROLES.OWNER.allowed,
		})
		.returning();

	await db.insert(account_to_tenant_table).values({
		account_id: account.id,
		tenant_id: tenant.id,
		role_id: role.id,
	});
});

describe("Sign In Route", () => {
	test("should return 400 if email is not provided", async () => {
		const form = new FormData();
		form.append("password", "password123");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.email).toBeDefined();
	});

	test("should return 400 if password is not provided", async () => {
		const form = new FormData();
		form.append("email", "test@example.com");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.password).toBeDefined();
	});

	test("should return 400 if email is not valid", async () => {
		const form = new FormData();
		form.append("email", "invalid-email");
		form.append("password", "password123");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.email).toBeDefined();
	});

	test("should return 400 if password is less than 8 characters", async () => {
		const form = new FormData();
		form.append("email", "test@example.com");
		form.append("password", "short");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.password).toBeDefined();
	});

	test("should return 400 if user does not exist", async () => {
		const form = new FormData();
		form.append("email", "nonexistent@example.com");
		form.append("password", "password123");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.form).toBe("A user with this email does not exist.");
	});

	test("should return 400 if password is incorrect", async () => {
		const form = new FormData();
		form.append("email", "test@example.com");
		form.append("password", "wrongpassword");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("error");
		expect(body.errors).toBeDefined();
		expect(body.errors?.form).toBe("Invalid email or password");
	});

	test("should return 200 if sign in is successful", async () => {
		const form = new FormData();
		form.append("email", "test@example.com");
		form.append("password", "password123");

		const response = await app.request(SIGN_IN_ROUTE_PATH, {
			method: "POST",
			body: form,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as SignInRouteResponse;

		expect(body.status).toBe("ok");
		expect(body.payload).toBeDefined();
		expect(body.payload?.account.email).toBe("test@example.com");
		expect(body.payload?.user).toBeDefined();
		expect(body.payload?.csrfToken).toBeDefined(); // Verify CSRF token is returned

		// Check for session cookie
		const cookies = response.headers.get("set-cookie");
		expect(cookies).toBeDefined();
		expect(cookies).toContain("session=");
	});
});
