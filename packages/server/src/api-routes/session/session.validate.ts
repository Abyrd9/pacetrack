import {
	makeValidateSessionRouteResponse,
	VALIDATE_SESSION_ROUTE_PATH,
} from "@pacetrack/schema";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { setSessionTokenCookie } from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";
import { generateCSRFToken } from "src/utils/helpers/csrf";
import {
	deleteSessionTokenCookie,
	setCSRFTokenCookie,
} from "src/utils/helpers/csrf-cookie";
import { logger } from "src/utils/helpers/logger";

export function validateSessionRoute(app: App) {
	app.post(VALIDATE_SESSION_ROUTE_PATH, async (c) => {
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware(
			"SESSION_VALIDATE",
			`Starting session validation`,
			requestId,
		);

		try {
			const tenantId = c.get("tenant_id");

			logger.middleware(
				"SESSION_VALIDATE",
				`Tenant ID from context: ${tenantId || "undefined"}`,
				requestId,
			);

			if (!tenantId) {
				logger.middleware(
					"SESSION_VALIDATE",
					"No tenant ID found in context - returning 401",
					requestId,
				);
				return c.json(
					makeValidateSessionRouteResponse({
						key: VALIDATE_SESSION_ROUTE_PATH,
						status: "error",
						errors: { global: "Unauthorized" },
					}),
					401,
				);
			}

			if (!Bun.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

			logger.middleware(
				"SESSION_VALIDATE",
				"Extracting session token from cookie",
				requestId,
			);

			const token = await getSignedCookie(
				c,
				Bun.env.SESSION_SECRET,
				"pacetrack-session",
			);

			logger.middleware(
				"SESSION_VALIDATE",
				`Session token found: ${token ? "yes" : "no"}`,
				requestId,
			);

			if (!token) {
				logger.middleware(
					"SESSION_VALIDATE",
					"No session token found - returning 401",
					requestId,
				);
				return c.json(
					makeValidateSessionRouteResponse({
						key: VALIDATE_SESSION_ROUTE_PATH,
						status: "error",
						errors: {
							global: "Unauthorized",
						},
					}),
					401,
				);
			}

			const ipAddress =
				c.req.header("x-forwarded-for") ??
				c.req.header("x-real-ip") ??
				c.req.header("cf-connecting-ip") ??
				"";

			const userAgent = c.req.header("user-agent") ?? "";

			logger.middleware(
				"SESSION_VALIDATE",
				`Validating session token with IP: ${ipAddress}, User-Agent: ${userAgent.substring(0, 50)}...`,
				requestId,
			);

			const {
				session,
				user: userRef,
				account: accountRef,
				tenant: tenantRef,
				role: roleRef,
			} = await sessions.validateToken({
				token,
				tenantId,
				ipAddress,
				userAgent,
			});

			logger.middleware(
				"SESSION_VALIDATE",
				`Session validation result: ${session ? "valid" : "invalid"}`,
				requestId,
				{
					userId: userRef?.id,
					tenantId: tenantRef?.id,
				},
			);

			if (session === null) {
				logger.middleware(
					"SESSION_VALIDATE",
					"Session validation failed - deleting cookie and returning 401",
					requestId,
				);
				await deleteSessionTokenCookie(c);
				return c.json(
					makeValidateSessionRouteResponse({
						key: VALIDATE_SESSION_ROUTE_PATH,
						status: "error",
						errors: {
							global: "Unauthorized",
						},
					}),
					401,
				);
			}

			logger.middleware(
				"SESSION_VALIDATE",
				"Session validation successful - refreshing cookies",
				requestId,
				{
					userId: userRef.id,
					tenantId: tenantRef.id,
				},
			);

			// Refresh the session cookie - convert number timestamp to Date
			await setSessionTokenCookie(c, token, new Date(session.expires_at));

			// Generate and set CSRF token cookie
			const csrfToken = await generateCSRFToken(token);
			await setCSRFTokenCookie(c, csrfToken, new Date(session.expires_at));

			logger.middleware(
				"SESSION_VALIDATE",
				"Session validation completed successfully",
				requestId,
			);

			return c.json(
				makeValidateSessionRouteResponse({
					key: VALIDATE_SESSION_ROUTE_PATH,
					status: "ok",
					payload: {
						user_id: userRef.id,
						account_id: accountRef.id,
						tenant_id: tenantRef.id,
						role_id: roleRef.id,
						session: session,
					},
				}),
				200,
			);
		} catch (error) {
			logger.middlewareError(
				"SESSION_VALIDATE",
				"Error during session validation",
				requestId,
				error,
			);
			return c.json(
				makeValidateSessionRouteResponse({
					key: VALIDATE_SESSION_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
