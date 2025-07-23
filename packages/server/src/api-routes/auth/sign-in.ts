import {
	SIGN_IN_ROUTE_PATH,
	SignInRequestSchema,
	makeSignInRouteResponse,
	role_table,
	tenant_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "../../db";
import {
	setCSRFTokenCookie,
	setSessionTokenCookie,
} from "../../utils/helpers/auth-cookie";
import { sessions } from "../../utils/helpers/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function signInRoute(app: App) {
	app.post(SIGN_IN_ROUTE_PATH, async (c) => {
		try {
			const parsed = await getParsedBody(c.req, SignInRequestSchema);

			if (!parsed.success) {
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

			// Get user, tenant, and role in a single query
			const userTenantResult = await db
				.select({
					user: user_table,
					tenant: tenant_table,
					role: role_table,
				})
				.from(users_to_tenants_table)
				.innerJoin(
					user_table,
					eq(users_to_tenants_table.user_id, user_table.id),
				)
				.innerJoin(
					tenant_table,
					eq(users_to_tenants_table.tenant_id, tenant_table.id),
				)
				.innerJoin(
					role_table,
					eq(users_to_tenants_table.role_id, role_table.id),
				)
				.where(eq(user_table.email, email))
				.limit(1);

			if (userTenantResult.length === 0) {
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

			const { user, tenant, role } = userTenantResult[0];

			if (user?.password) {
				const isCorrectPassword = await Bun.password.verify(
					password,
					user.password,
				);

				if (!isCorrectPassword) {
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

				// If the user has a reset password token, we'll clear it out
				// because they've successfully remembered their password.
				if (user.reset_password_token) {
					await db.update(user_table).set({
						reset_password_expires: null,
						reset_password_token: null,
					});
				}

				// By this point we've successfully signed in the user.
				// We'll create a new session for them and return the session token.

				// But first we need to get the tenant id from the user.
				// We can either get that ID from the latest session, or if there isn't one,
				// get the tenant's personal tenant.

				const session = await sessions.getLatestSession(user.id);

				// Use the tenant from the join query or fall back to personal tenant
				const effectiveTenant = session
					? await db.query.tenant_table.findFirst({
							where: eq(tenant_table.id, session.tenant_id),
						})
					: tenant; // Use the tenant from our join query

				if (!effectiveTenant) {
					return c.json(
						makeSignInRouteResponse({
							key: SIGN_IN_ROUTE_PATH,
							status: "error",
							errors: { form: "No tenant found" },
						}),
						400,
					);
				}

				const ipAddress =
					c.req.header("x-forwarded-for") ??
					c.req.header("x-real-ip") ??
					c.req.header("cf-connecting-ip") ??
					"";

				const userAgent = c.req.header("user-agent") ?? "";

				const token = sessions.generateToken();
				const sessionToken = await sessions.create({
					userId: user.id,
					tenantId: effectiveTenant.id,
					roleId: role.id,
					token,
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
					makeSignInRouteResponse({
						key: SIGN_IN_ROUTE_PATH,
						status: "ok",
						payload: {
							user,
							csrfToken, // Include CSRF token in response
						},
					}),
					200,
				);
			}

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
