import {
	VALIDATE_SESSION_ROUTE_PATH,
	makeValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import {
	deleteSessionTokenCookie,
	setCSRFTokenCookie,
	setSessionTokenCookie,
} from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";
import { generateCSRFToken } from "src/utils/helpers/csrf";

export function validateSessionRoute(app: App) {
	app.post(VALIDATE_SESSION_ROUTE_PATH, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			if (!Bun.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

			const token = await getSignedCookie(
				c,
				Bun.env.SESSION_SECRET,
				"pacetrack-session",
			);

			if (!token) {
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

			const {
				session,
				user: userRef,
				tenant: tenantRef,
				role: roleRef,
			} = await sessions.validateToken({
				token,
				tenantId,
				ipAddress,
				userAgent,
			});

			if (session === null) {
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

			// Refresh the session cookie - convert number timestamp to Date
			await setSessionTokenCookie(c, token, new Date(session.expires_at));

			// Generate and set CSRF token cookie
			const csrfToken = await generateCSRFToken(token);
			await setCSRFTokenCookie(c, csrfToken, new Date(session.expires_at));

			return c.json(
				makeValidateSessionRouteResponse({
					key: VALIDATE_SESSION_ROUTE_PATH,
					status: "ok",
					payload: {
						user_id: userRef.id,
						tenant_id: tenantRef.id,
						role_id: roleRef.id,
						session: session,
					},
				}),
				200,
			);
		} catch (error) {
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
