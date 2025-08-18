import {
	makeSessionRevokeAllRouteResponse,
	SESSION_REVOKE_ALL_ROUTE_PATH,
} from "@pacetrack/schema";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { sessions } from "src/utils/helpers/auth-session";

export function sessionRevokeAllRoute(app: App) {
	app.post(SESSION_REVOKE_ALL_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			if (!Bun.env.SESSION_SECRET) {
				throw new Error("SESSION_SECRET is not set");
			}

			const token = await getSignedCookie(
				c,
				Bun.env.SESSION_SECRET,
				"pacetrack-session",
			);

			if (!token) {
				return c.json(
					makeSessionRevokeAllRouteResponse({
						key: SESSION_REVOKE_ALL_ROUTE_PATH,
						status: "error",
						errors: { global: "Unauthorized" },
					}),
					401,
				);
			}

			// Get current session ID
			const currentSessionId = await sessions.getSessionIdFromToken(token);
			if (!currentSessionId) {
				return c.json(
					makeSessionRevokeAllRouteResponse({
						key: SESSION_REVOKE_ALL_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid session" },
					}),
					401,
				);
			}

			// Get all user sessions
			const userSessions = await sessions.listUserSessions(userId);

			// Revoke all sessions except the current one
			for (const session of userSessions) {
				if (session.id !== currentSessionId) {
					await sessions.invalidate({ sessionId: session.id });
				}
			}

			return c.json(
				makeSessionRevokeAllRouteResponse({
					key: SESSION_REVOKE_ALL_ROUTE_PATH,
					status: "ok",
					payload: { message: "Other sessions revoked" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeSessionRevokeAllRouteResponse({
					key: SESSION_REVOKE_ALL_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
