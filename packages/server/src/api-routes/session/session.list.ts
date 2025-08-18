import {
	makeSessionListRouteResponse,
	SESSION_LIST_ROUTE_PATH,
} from "@pacetrack/schema";
import type { App } from "src";
import { sessions } from "src/utils/helpers/auth-session";

export function sessionListRoute(app: App) {
	app.get(SESSION_LIST_ROUTE_PATH, async (c) => {
		const userId = c.get("user_id");

		const response = await sessions.listUserSessions(userId);

		return c.json(
			makeSessionListRouteResponse({
				key: SESSION_LIST_ROUTE_PATH,
				status: "ok",
				payload: { sessions: response },
			}),
			200,
		);
	});
}
