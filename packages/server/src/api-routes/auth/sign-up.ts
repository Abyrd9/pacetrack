import {
	account_table,
	account_to_tenant_table,
	DEFAULT_ROLES,
	makeSignUpRouteResponse,
	membership_table,
	role_table,
	SIGN_UP_ROUTE_PATH,
	SignUpRequestSchema,
	tenant_table,
	user_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
import type { App } from "src";
import { setCSRFTokenCookie } from "src/utils/helpers/csrf-cookie";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";
import { db } from "../../db";
import { setSessionTokenCookie } from "../../utils/helpers/auth-cookie";
import { sessions } from "../../utils/helpers/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";
import { logger } from "../../utils/helpers/logger";

export function signUpRoute(app: App) {
	app.post(SIGN_UP_ROUTE_PATH, async (c) => {
		const startTime = Date.now();
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware("SIGN_UP", `Starting sign-up process`, requestId);

		try {
			logger.middleware("SIGN_UP", "Parsing request body", requestId);
			const parsed = await getParsedBody(c.req, SignUpRequestSchema);

			if (!parsed.success) {
				logger.middleware(
					"SIGN_UP",
					`Request validation failed: ${JSON.stringify(parsed.errors)}`,
					requestId,
				);
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
			logger.middleware(
				"SIGN_UP",
				`Processing sign-up for email: ${email}`,
				requestId,
			);

			logger.middleware(
				"SIGN_UP",
				"Checking if user already exists",
				requestId,
			);
			const userAlreadyExists = await db.query.account_table.findFirst({
				where: eq(account_table.email, email),
			});

			if (userAlreadyExists) {
				logger.middleware(
					"SIGN_UP",
					`Account already exists for email: ${email}`,
					requestId,
				);
				return c.json(
					makeSignUpRouteResponse({
						key: SIGN_UP_ROUTE_PATH,
						status: "error",
						errors: {
							form: "Account already exists",
						},
					}),
					400,
				);
			}

			logger.middleware(
				"SIGN_UP",
				"Account does not exist, starting database transaction",
				requestId,
			);

			return db
				.transaction(async (tx) => {
					logger.middleware("SIGN_UP", "Hashing password", requestId);
					const hashed = await Bun.password.hash(password);

					logger.middleware("SIGN_UP", "Creating user record", requestId);
					const user = await tx
						.insert(user_table)
						.values({
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					logger.middleware("SIGN_UP", "Creating account record", requestId);
					const account = await tx
						.insert(account_table)
						.values({
							email,
							password: hashed,
							user_id: user[0].id,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					logger.middleware(
						"SIGN_UP",
						`Account created with ID: ${account[0].id}`,
						requestId,
					);

					logger.middleware(
						"SIGN_UP",
						"Creating Stripe customer and subscription",
						requestId,
					);
					const { customer, subscription } = await createNewCustomer(
						user[0],
						account[0],
					);
					logger.middleware(
						"SIGN_UP",
						`Stripe customer created: ${customer.id}, subscription: ${subscription.id}`,
						requestId,
					);

					logger.middleware("SIGN_UP", "Creating membership record", requestId);
					const membership = await tx
						.insert(membership_table)
						.values({
							customer_id: customer.id,
							subscription_id: subscription.id,
							created_by: user[0].id,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					logger.middleware(
						"SIGN_UP",
						`Membership created with ID: ${membership[0].id}`,
						requestId,
					);

					// Create the tenant
					logger.middleware("SIGN_UP", "Creating tenant record", requestId);
					const tenant = await tx
						.insert(tenant_table)
						.values({
							name: "Personal",
							created_by: user[0].id,
							kind: "personal",
							membership_id: membership[0].id,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					logger.middleware(
						"SIGN_UP",
						`Tenant created with ID: ${tenant[0].id}`,
						requestId,
					);

					// Create the owner role for this tenant
					logger.middleware("SIGN_UP", "Creating owner role", requestId);
					const ownerRole = await tx
						.insert(role_table)
						.values({
							...DEFAULT_ROLES.OWNER,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					logger.middleware(
						"SIGN_UP",
						`Owner role created with ID: ${ownerRole[0].id}`,
						requestId,
					);

					// Assign the account to the tenant with the owner role
					logger.middleware(
						"SIGN_UP",
						"Assigning account to tenant with owner role",
						requestId,
					);
					await tx.insert(account_to_tenant_table).values({
						account_id: account[0].id,
						tenant_id: tenant[0].id,
						role_id: ownerRole[0].id,
						created_at: sql`now()`,
						updated_at: sql`now()`,
					});

					// Note: tenant-membership relationship is handled via tenant.membership_id

					logger.middleware(
						"SIGN_UP",
						"User assigned to tenant successfully",
						requestId,
					);

					const ipAddress =
						c.req.header("x-forwarded-for") ??
						c.req.header("x-real-ip") ??
						c.req.header("cf-connecting-ip") ??
						"";

					const userAgent = c.req.header("user-agent") ?? "";

					logger.middleware(
						"SIGN_UP",
						`Creating session for IP: ${ipAddress}`,
						requestId,
					);
					const token = sessions.generateToken();
					const sessionToken = await sessions.create({
						token,
						userId: user[0].id,
						accountId: account[0].id,
						tenantId: tenant[0].id,
						roleId: ownerRole[0].id, // TODO: This is wrong, we need to get the role from the user
						ipAddress,
						userAgent,
					});

					logger.middleware(
						"SIGN_UP",
						`Session created, expires at: ${sessionToken.expires_at}`,
						requestId,
					);

					// Generate CSRF token for this session
					logger.middleware("SIGN_UP", "Generating CSRF token", requestId);
					const csrfToken = await generateCSRFToken(token);

					logger.middleware(
						"SIGN_UP",
						"Setting session token cookie",
						requestId,
					);
					await setSessionTokenCookie(
						c,
						token,
						new Date(sessionToken.expires_at),
					);

					// Set CSRF token as a cookie for server-side access
					logger.middleware("SIGN_UP", "Setting CSRF token cookie", requestId);
					await setCSRFTokenCookie(
						c,
						csrfToken,
						new Date(sessionToken.expires_at),
					);

					const duration = Date.now() - startTime;
					logger.middleware(
						"SIGN_UP",
						`Sign-up completed successfully in ${duration}ms`,
						requestId,
						{
							userId: user[0].id,
							tenantId: tenant[0].id,
							accountId: account[0].id,
						},
					);

					return c.json(
						makeSignUpRouteResponse({
							key: SIGN_UP_ROUTE_PATH,
							status: "ok",
							payload: {
								account: account[0],
								user: user[0],
								csrfToken, // Include CSRF token in response
							},
						}),
						200,
					);
				})
				.catch((error) => {
					logger.middlewareError(
						"SIGN_UP",
						"Database transaction failed",
						requestId,
						error,
					);
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
			logger.middlewareError(
				"SIGN_UP",
				"Unexpected error during sign-up",
				requestId,
				error,
			);
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
