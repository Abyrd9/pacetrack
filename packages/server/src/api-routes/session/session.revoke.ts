import {
	SESSION_REVOKE_ROUTE_PATH,
	SessionRevokeRequestSchema,
	makeSessionRevokeRouteResponse,
} from "@pacetrack/schema";
import type { App } from "src";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionRevokeRoute(app: App) {
	app.post(SESSION_REVOKE_ROUTE_PATH, async (c) => {
		const userId = c.get("user_id");
		const currentSession = c.get("session");

		const parsed = await getParsedBody(c.req, SessionRevokeRequestSchema);
		if (!parsed.success) {
			return c.json(
				makeSessionRevokeRouteResponse({
					key: SESSION_REVOKE_ROUTE_PATH,
					status: "error",
					errors: parsed.errors,
				}),
				400,
			);
		}

		const { sessionId } = parsed.data;

		// Check if session exists and belongs to user by trying to get user sessions
		const userSessions = await sessions.listUserSessions(userId);
		const sessionExists = userSessions.some(
			(session) => session.id === sessionId,
		);

		if (!sessionExists) {
			return c.json(
				makeSessionRevokeRouteResponse({
					key: SESSION_REVOKE_ROUTE_PATH,
					status: "error",
					errors: { global: "Session not found" },
				}),
				404,
			);
		}

		if (currentSession && currentSession.id === sessionId) {
			return c.json(
				makeSessionRevokeRouteResponse({
					key: SESSION_REVOKE_ROUTE_PATH,
					status: "error",
					errors: {
						global: "Use sign-out instead of revoking current session",
					},
				}),
				400,
			);
		}

		await sessions.invalidate({ sessionId });

		return c.json(
			makeSessionRevokeRouteResponse({
				key: SESSION_REVOKE_ROUTE_PATH,
				status: "ok",
				payload: { message: "Session revoked" },
			}),
			200,
		);
	});
}
