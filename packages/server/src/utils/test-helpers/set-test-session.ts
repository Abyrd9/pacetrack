import {
	DEFAULT_ROLES,
	account_table,
	role_table,
	tenant_table,
	user_table,
	users_to_tenants_table,
	type User,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { db } from "src/db";
import { sessions } from "../helpers/auth-session";
import { generateCSRFToken } from "../helpers/csrf";

let testUserCounter = 0;

export async function setTestSession(
	passedInUser?: Partial<Pick<User, "id" | "email" | "password">>,
) {
	return await db.transaction(async (tx) => {
		if (!Bun.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

		const hashed = await Bun.password.hash(
			passedInUser?.password ?? "password123",
		);

		let user: User | undefined;
		if (passedInUser) {
			// Check for existing user
			const existingUser = await tx.query.user_table.findFirst({
				where: (user, { eq }) =>
					eq(
						user.email,
						passedInUser?.email ?? `test${testUserCounter++}@test.com`,
					),
			});

			if (existingUser) user = existingUser;
		}

		if (!user) {
			const resp = await tx
				.insert(user_table)
				.values({
					email: passedInUser?.email ?? `test${testUserCounter++}@test.com`,
					password: passedInUser?.password ?? hashed,
				})
				.returning();

			user = resp[0];
		}

		const [account] = await tx
			.insert(account_table)
			.values({
				created_by: user.id,
				customer_id: "cus_123",
				subscription_id: "sub_123",
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		// Now with this account we need to make a personal tenant and add the user to it
		const [tenant] = await tx
			.insert(tenant_table)
			.values({
				name: "Personal",
				account_id: account.id,
				created_by: user.id,
				kind: "personal",
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		// Create the Owner role for this tenant
		const [role] = await tx
			.insert(role_table)
			.values({
				name: DEFAULT_ROLES.OWNER.name,
				kind: DEFAULT_ROLES.OWNER.kind,
				allowed: DEFAULT_ROLES.OWNER.allowed,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		// Add the user to the tenant with the Owner role
		await tx.insert(users_to_tenants_table).values({
			user_id: user.id,
			tenant_id: tenant.id,
			role_id: role.id,
			is_primary_contact: true,
			is_billing_contact: true,
			created_at: sql`now()`,
			updated_at: sql`now()`,
		});

		const token = sessions.generateToken();
		const session = await sessions.create({
			userId: user.id,
			tenantId: tenant.id,
			roleId: role.id,
			token,
		});

		// Generate CSRF token for this session
		const csrfToken = await generateCSRFToken(token);

		const cookie = await serializeSigned(
			"pacetrack-session",
			token,
			Bun.env.SESSION_SECRET,
			{
				httpOnly: true,
				sameSite: "Lax",
				expires: new Date(session.expires_at),
				path: "/",
			},
		);

		return {
			user,
			account,
			tenant,
			role,
			cookie,
			csrfToken, // Include CSRF token for tests
		};
	});
}

/**
 * Helper function to make authenticated requests with CSRF tokens
 * Use this for state-changing operations (POST, PUT, DELETE)
 */
export function makeAuthenticatedRequest(
	cookie: string,
	csrfToken: string,
	method = "GET",
	headers: Record<string, string> = {},
) {
	const baseHeaders: Record<string, string> = {
		Cookie: cookie,
		...headers,
	};

	// Add CSRF token for state-changing operations
	if (method !== "GET") {
		baseHeaders["x-csrf-token"] = csrfToken;
	}

	return baseHeaders;
}
