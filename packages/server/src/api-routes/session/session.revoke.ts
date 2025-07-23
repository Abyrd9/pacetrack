import { SESSION_REVOKE_ROUTE } from "@pacetrack/schema";
import type { App } from "src";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionRevokeRoute(app: App) {
  app.post(SESSION_REVOKE_ROUTE.path, async (c) => {
    const userId = c.get("user_id");
    const currentSession = c.get("session");

    const parsed = await getParsedBody(c.req, SESSION_REVOKE_ROUTE.request);
    if (!parsed.success) {
      return c.json(
        SESSION_REVOKE_ROUTE.createRouteResponse({
          status: "error",
          errors: parsed.errors,
        }),
        400
      );
    }

    const { sessionId } = parsed.data;

    // Check if session exists and belongs to user by trying to get user sessions
    const userSessions = await getSessionClient().listUserSessions({ userId });
    const sessionExists = userSessions.some(
      (session) => session.id === sessionId
    );

    if (!sessionExists) {
      return c.json(
        SESSION_REVOKE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Session not found" },
        }),
        404
      );
    }

    if (currentSession && currentSession.id === sessionId) {
      return c.json(
        SESSION_REVOKE_ROUTE.createRouteResponse({
          status: "error",
          errors: {
            global: "Use sign-out instead of revoking current session",
          },
        }),
        400
      );
    }

    await getSessionClient().invalidate({ sessionId });

    return c.json(
      SESSION_REVOKE_ROUTE.createRouteResponse({
        status: "ok",
        payload: { message: "Session revoked" },
      }),
      200
    );
  });
}
