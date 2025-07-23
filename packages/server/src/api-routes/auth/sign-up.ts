import {
	DEFAULT_ROLES,
	SIGN_UP_ROUTE_PATH,
	SignUpRequestSchema,
	account_table,
	makeSignUpRouteResponse,
	role_table,
	tenant_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
import type { App } from "src";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";
import { db } from "../../db";
import {
	setCSRFTokenCookie,
	setSessionTokenCookie,
} from "../../utils/helpers/auth-cookie";
import { sessions } from "../../utils/helpers/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function signUpRoute(app: App) {
	app.post(SIGN_UP_ROUTE_PATH, async (c) => {
		try {
			const parsed = await getParsedBody(c.req, SignUpRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeSignUpRouteResponse({
						key: SIGN_UP_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { email, password } = parsed.data;

			const userAlreadyExists = await db.query.user_table.findFirst({
				where: eq(user_table.email, email),
			});

			if (userAlreadyExists) {
				return c.json(
					makeSignUpRouteResponse({
						key: SIGN_UP_ROUTE_PATH,
						status: "error",
						errors: {
							form: "User already exists",
						},
					}),
					400,
				);
			}

			return db
				.transaction(async (tx) => {
					const hashed = await Bun.password.hash(password);
					const user = await tx
						.insert(user_table)
						.values({
							email,
							password: hashed,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					const { customer, subscription } = await createNewCustomer(user[0]);

					const account = await tx
						.insert(account_table)
						.values({
							customer_id: customer.id,
							subscription_id: subscription.id,
							created_by: user[0].id,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					// Create the tenant
					const tenant = await tx
						.insert(tenant_table)
						.values({
							name: "Personal",
							account_id: account[0].id,
							created_by: user[0].id,
							kind: "personal",
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					// Create the owner role for this tenant
					const ownerRole = await tx
						.insert(role_table)
						.values({
							...DEFAULT_ROLES.OWNER,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					// Assign the user to the tenant with the owner role
					await tx.insert(users_to_tenants_table).values({
						user_id: user[0].id,
						tenant_id: tenant[0].id,
						role_id: ownerRole[0].id,
						is_primary_contact: true,
						is_billing_contact: true,
						created_at: sql`now()`,
						updated_at: sql`now()`,
					});

					const ipAddress =
						c.req.header("x-forwarded-for") ??
						c.req.header("x-real-ip") ??
						c.req.header("cf-connecting-ip") ??
						"";

					const userAgent = c.req.header("user-agent") ?? "";

					const token = sessions.generateToken();
					const sessionToken = await sessions.create({
						token,
						userId: user[0].id,
						tenantId: tenant[0].id,
						roleId: ownerRole[0].id, // TODO: This is wrong, we need to get the role from the user
						ipAddress,
						userAgent,
					});

					// Generate CSRF token for this session
					const csrfToken = await generateCSRFToken(token);

					await setSessionTokenCookie(
						c,
						token,
						new Date(sessionToken.expires_at),
					);

					// Set CSRF token as a cookie for server-side access
					await setCSRFTokenCookie(
						c,
						csrfToken,
						new Date(sessionToken.expires_at),
					);

					return c.json(
						makeSignUpRouteResponse({
							key: SIGN_UP_ROUTE_PATH,
							status: "ok",
							payload: {
								accountId: account[0].id,
								user: user[0],
								csrfToken, // Include CSRF token in response
							},
						}),
						200,
					);
				})
				.catch((error) => {
					console.error(error);
					return c.json(
						makeSignUpRouteResponse({
							key: SIGN_UP_ROUTE_PATH,
							status: "error",
							errors: { global: "Something went wrong." },
						}),
						400,
					);
				});
		} catch (error) {
			return c.json(
				makeSignUpRouteResponse({
					key: SIGN_UP_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
