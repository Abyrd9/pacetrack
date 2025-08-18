import {
	account_table,
	account_to_tenant_table,
	makeSignInRouteResponse,
	role_table,
	SIGN_IN_ROUTE_PATH,
	SignInRequestSchema,
	tenant_table,
	user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { setSessionTokenCookie } from "src/utils/helpers/auth-cookie";
import { db } from "../../db";
import { sessions } from "../../utils/helpers/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf";
import { setCSRFTokenCookie } from "../../utils/helpers/csrf-cookie";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";
import { logger } from "../../utils/helpers/logger";

export function signInRoute(app: App) {
	app.post(SIGN_IN_ROUTE_PATH, async (c) => {
		const startTime = Date.now();
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware("SIGN_IN", `Starting sign-in process`, requestId);

		try {
			logger.middleware("SIGN_IN", "Parsing request body", requestId);
			const parsed = await getParsedBody(c.req, SignInRequestSchema);

			if (!parsed.success) {
				logger.middleware(
					"SIGN_IN",
					`Request validation failed: ${JSON.stringify(parsed.errors)}`,
					requestId,
				);
				return c.json(
					makeSignInRouteResponse({
						key: SIGN_IN_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { email, password } = parsed.data;
			logger.middleware(
				"SIGN_IN",
				`Processing sign-in for email: ${email}`,
				requestId,
			);

			// Get user, tenant, and role in a single query
			logger.middleware(
				"SIGN_IN",
				"Querying user, tenant, and role information",
				requestId,
			);
			const userTenantResult = await db
				.select({
					user: user_table,
					account: account_table,
					tenant: tenant_table,
					role: role_table,
				})
				.from(account_to_tenant_table)
				.innerJoin(
					account_table,
					eq(account_to_tenant_table.account_id, account_table.id),
				)
				.innerJoin(user_table, eq(account_table.user_id, user_table.id))
				.innerJoin(
					tenant_table,
					eq(account_to_tenant_table.tenant_id, tenant_table.id),
				)
				.innerJoin(
					role_table,
					eq(account_to_tenant_table.role_id, role_table.id),
				)
				.where(eq(account_table.email, email))
				.limit(1);

			if (userTenantResult.length === 0) {
				logger.middleware(
					"SIGN_IN",
					`User not found for email: ${email}`,
					requestId,
				);
				return c.json(
					makeSignInRouteResponse({
						key: SIGN_IN_ROUTE_PATH,
						status: "error",
						errors: {
							form: "A user with this email does not exist.",
						},
					}),
					400,
				);
			}

			const { user, account, tenant, role } = userTenantResult[0];
			logger.middleware(
				"SIGN_IN",
				`User found with ID: ${user.id}, tenant: ${tenant.id}, role: ${role.id}`,
				requestId,
			);

			if (account?.password) {
				logger.middleware("SIGN_IN", "Verifying password", requestId);
				const isCorrectPassword = await Bun.password.verify(
					password,
					account.password,
				);

				if (!isCorrectPassword) {
					logger.middleware(
						"SIGN_IN",
						`Invalid password for user: ${user.id}`,
						requestId,
					);
					return c.json(
						makeSignInRouteResponse({
							key: SIGN_IN_ROUTE_PATH,
							status: "error",
							errors: {
								form: "Invalid email or password",
							},
						}),
						400,
					);
				}

				logger.middleware(
					"SIGN_IN",
					"Password verified successfully",
					requestId,
				);

				// If the account has a reset password token, we'll clear it out
				// because they've successfully remembered their password.
				if (account.reset_password_token) {
					logger.middleware(
						"SIGN_IN",
						"Clearing reset password token",
						requestId,
					);
					await db
						.update(account_table)
						.set({
							reset_password_expires: null,
							reset_password_token: null,
						})
						.where(eq(account_table.id, account.id));
				}

				// By this point we've successfully signed in the user.
				// We'll create a new session for them and return the session token.

				// But first we need to get the tenant id from the user.
				// We can either get that ID from the latest session, or if there isn't one,
				// get the tenant's personal tenant.

				logger.middleware(
					"SIGN_IN",
					"Getting latest session for user",
					requestId,
				);
				const session = await sessions.getLatestSession(user.id);

				// Use the tenant from the join query or fall back to personal tenant
				logger.middleware("SIGN_IN", "Determining effective tenant", requestId);
				const effectiveTenant = session
					? await db.query.tenant_table.findFirst({
							where: eq(tenant_table.id, session.tenant_id),
						})
					: tenant; // Use the tenant from our join query

				if (!effectiveTenant) {
					logger.middleware(
						"SIGN_IN",
						`No effective tenant found for user: ${user.id}`,
						requestId,
					);
					return c.json(
						makeSignInRouteResponse({
							key: SIGN_IN_ROUTE_PATH,
							status: "error",
							errors: { form: "No tenant found" },
						}),
						400,
					);
				}

				logger.middleware(
					"SIGN_IN",
					`Using effective tenant: ${effectiveTenant.id}`,
					requestId,
				);

				const ipAddress =
					c.req.header("x-forwarded-for") ??
					c.req.header("x-real-ip") ??
					c.req.header("cf-connecting-ip") ??
					"";

				const userAgent = c.req.header("user-agent") ?? "";

				logger.middleware(
					"SIGN_IN",
					`Creating session for IP: ${ipAddress}`,
					requestId,
				);
				const token = sessions.generateToken();
				const sessionToken = await sessions.create({
					userId: user.id,
					accountId: account.id,
					tenantId: effectiveTenant.id,
					roleId: role.id,
					token,
					ipAddress,
					userAgent,
				});

				logger.middleware(
					"SIGN_IN",
					`Session created, expires at: ${sessionToken.expires_at}`,
					requestId,
				);

				// Generate CSRF token for this session
				logger.middleware("SIGN_IN", "Generating CSRF token", requestId);
				const csrfToken = await generateCSRFToken(token);

				logger.middleware("SIGN_IN", "Setting session token cookie", requestId);
				await setSessionTokenCookie(
					c,
					token,
					new Date(sessionToken.expires_at),
				);

				// Set CSRF token as a cookie for server-side access
				logger.middleware("SIGN_IN", "Setting CSRF token cookie", requestId);
				await setCSRFTokenCookie(
					c,
					csrfToken,
					new Date(sessionToken.expires_at),
				);

				const duration = Date.now() - startTime;
				logger.middleware(
					"SIGN_IN",
					`Sign-in completed successfully in ${duration}ms`,
					requestId,
					{
						userId: user.id,
						tenantId: effectiveTenant.id,
						roleId: role.id,
					},
				);

				return c.json(
					makeSignInRouteResponse({
						key: SIGN_IN_ROUTE_PATH,
						status: "ok",
						payload: {
							user,
							account,
							csrfToken, // Include CSRF token in response
						},
					}),
					200,
				);
			}

			logger.middleware(
				"SIGN_IN",
				`Account has no password set: ${account?.id || "unknown"}`,
				requestId,
			);
			return c.json(
				makeSignInRouteResponse({
					key: SIGN_IN_ROUTE_PATH,
					status: "error",
					errors: {
						form: "Invalid email or password",
					},
				}),
				400,
			);
		} catch (error) {
			logger.middlewareError(
				"SIGN_IN",
				"Unexpected error during sign-in",
				requestId,
				error,
			);
			return c.json(
				makeSignInRouteResponse({
					key: SIGN_IN_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
