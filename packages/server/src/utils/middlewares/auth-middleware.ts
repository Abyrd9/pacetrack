import { getSignedCookie } from "hono/cookie";
import {
  PUBLIC_API_ROUTES,
  PUBLIC_WEB_ROUTES,
} from "src/constants/public-routes";
import type { App } from "../../index";
import { setSessionTokenCookie } from "../helpers/auth/auth-cookie";
import { getSessionClient } from "../helpers/auth/auth-session";
import {
  deleteCSRFTokenCookie,
  deleteSessionTokenCookie,
} from "../helpers/csrf/csrf-cookie";
import { getRecordFunction } from "../helpers/timing/get-record-function";

const record = getRecordFunction({
  name: "auth-middleware",
  description: "Authentication middleware duration",
});

// Authentication Middleware
export async function authMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const startTime = performance.now();

    try {
      // Skip auth for public routes
      if (
        PUBLIC_API_ROUTES.includes(c.req.path) ||
        c.req.path.startsWith("/serve/") ||
        c.req.path === "/"
      ) {
        record(c, startTime);
        return await next();
      }

      if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is not set");
      }

      // Try signed cookie first
      let token = await getSignedCookie(
        c,
        process.env.SESSION_SECRET,
        "pacetrack-session"
      );

      // Fallback: Bearer raw token from SSR
      const authorization = c.req.header("authorization") || "";
      if (!token && authorization.toLowerCase().startsWith("bearer ")) {
        token = authorization.slice(7).trim();
      }

      if (!token) {
        const requestOriginUrl = c.req.header("x-request-origin") || "";

        if (!PUBLIC_WEB_ROUTES.includes(requestOriginUrl)) {
          return c.json(
            {
              key: c.req.path,
              status: "error",
              errors: { global: "Unauthorized" },
            },
            401
          );
        } else {
          record(c, startTime);
          return await next();
        }
      }

      const session = await getSessionClient().validate({
        token,
      });

      if (session === null) {
        await deleteSessionTokenCookie(c);
        await deleteCSRFTokenCookie(c);
        record(c, startTime);
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Set the values in context
      c.set("user_id", session.user_id);
      c.set("account_id", session.account_id);
      c.set("tenant_id", session.tenant_id);
      c.set("role_id", session.role_id);
      c.set("session", session);

      await setSessionTokenCookie(c, token, new Date(session.expires_at));

      record(c, startTime);
      const result = await next();

      return result;
    } catch {
      await deleteSessionTokenCookie(c);
      await deleteCSRFTokenCookie(c);

      record(c, startTime);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
