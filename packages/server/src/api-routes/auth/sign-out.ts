import {
	SIGN_OUT_ROUTE_PATH,
	makeSignOutRouteResponse,
} from "@pacetrack/schema";
import type { App } from "src";
import {
	deleteCSRFTokenCookie,
	deleteSessionTokenCookie,
} from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";

export function signOutRoute(app: App) {
	app.post(SIGN_OUT_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const session = c.get("session");

			if (session) await sessions.invalidate({ sessionId: session.id });
			if (userId) await sessions.invalidateAll({ userId });

			await deleteSessionTokenCookie(c);
			await deleteCSRFTokenCookie(c);

			return c.json(
				makeSignOutRouteResponse({
					status: "ok",
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeSignOutRouteResponse({
					status: "ok",
				}),
				200,
			);
		}
	});
}
