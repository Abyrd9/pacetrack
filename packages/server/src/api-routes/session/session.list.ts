import { SESSION_LIST_ROUTE } from "@pacetrack/schema";
import type { App } from "src";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";

export function sessionListRoute(app: App) {
  app.get(SESSION_LIST_ROUTE.path, async (c) => {
    const userId = c.get("user_id");

    const response = await getSessionClient().listUserSessions({ userId });

    return c.json(
      SESSION_LIST_ROUTE.createRouteResponse({
        status: "ok",
        payload: { sessions: response },
      }),
      200
    );
  });
}
