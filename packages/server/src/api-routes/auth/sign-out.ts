import { SIGN_OUT_ROUTE } from "@pacetrack/schema";
import type { App } from "src";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import {
  deleteCSRFTokenCookie,
  deleteSessionTokenCookie,
} from "src/utils/helpers/csrf/csrf-cookie";

export function signOutRoute(app: App) {
  app.post(SIGN_OUT_ROUTE.path, async (c) => {
    try {
      const userId = c.get("user_id");
      const session = c.get("session");

      if (session)
        await getSessionClient().invalidate({ sessionId: session.id });
      if (userId)
        await getSessionClient().invalidateAllUserSessions({ userId });

      await deleteSessionTokenCookie(c);
      await deleteCSRFTokenCookie(c);

      return c.json(
        SIGN_OUT_ROUTE.createRouteResponse({
          status: "ok",
        }),
        200
      );
    } catch {
      return c.json(
        SIGN_OUT_ROUTE.createRouteResponse({
          status: "ok",
        }),
        200
      );
    }
  });
}
