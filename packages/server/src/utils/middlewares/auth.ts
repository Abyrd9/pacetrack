import { getSignedCookie } from "hono/cookie";
import {
  PUBLIC_API_ROUTES,
  PUBLIC_WEB_ROUTES,
} from "src/constants/public-routes";
import type { App } from "../../index";
import { setSessionTokenCookie } from "../helpers/auth-cookie";
import { sessions } from "../helpers/auth-session";
import { deleteSessionTokenCookie } from "../helpers/csrf-cookie";
import { logger } from "../helpers/logger";

// Authentication Middleware
export async function authMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware(
      "AUTH",
      `${c.req.method} ${c.req.path} - Starting auth check`,
      requestId
    );

    // Skip auth for public routes
    if (
      PUBLIC_API_ROUTES.includes(c.req.path) ||
      c.req.path.startsWith("/serve/") ||
      c.req.path === "/"
    ) {
      logger.middleware(
        "AUTH",
        "Public route - skipping auth check",
        requestId
      );
      return next();
    }

    if (!Bun.env.SESSION_SECRET) {
      logger.middlewareError("AUTH", "SESSION_SECRET is not set", requestId);
      throw new Error("SESSION_SECRET is not set");
    }

    logger.middleware(
      "AUTH",
      "Extracting session token from cookie/authorization",
      requestId
    );

    const cookie = c.req.header("cookie");
    const authorization = c.req.header("authorization") || "";
    logger.middleware("AUTH", `COOKIE: ${cookie}`, requestId);
    logger.middleware(
      "AUTH",
      `AUTHORIZATION: ${authorization ? "present" : "absent"}`,
      requestId
    );

    // Try signed cookie first
    let token = await getSignedCookie(
      c,
      Bun.env.SESSION_SECRET,
      "pacetrack-session"
    );

    // Fallback: Bearer raw token from SSR
    if (!token && authorization.toLowerCase().startsWith("bearer ")) {
      token = authorization.slice(7).trim();
      logger.middleware(
        "AUTH",
        "Using Bearer token from Authorization header",
        requestId
      );
    }

    if (!token) {
      const requestOriginUrl = c.req.header("x-request-origin");
      const path = requestOriginUrl || "";

      if (!PUBLIC_WEB_ROUTES.includes(path)) {
        logger.middleware(
          "AUTH",
          "No session token found - returning 401",
          requestId
        );
        return c.json(
          {
            key: c.req.path,
            status: "error",
            errors: { global: "Unauthorized" },
          },
          401
        );
      } else {
        logger.middleware(
          "AUTH",
          "No session token found - Forwarding because of public web route: " +
            path,
          requestId
        );

        return next();
      }
    }

    logger.middleware(
      "AUTH",
      "Session token found, extracting client info",
      requestId
    );
    const ipAddress =
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      c.req.header("cf-connecting-ip") ??
      "";

    const userAgent = c.req.header("user-agent") ?? "";

    logger.middleware(
      "AUTH",
      `Client IP: ${ipAddress}, User-Agent: ${userAgent.substring(0, 50)}...`,
      requestId
    );

    logger.middleware("AUTH", "Validating session token", requestId);
    try {
      const { session, tenant, user, account, role } =
        await sessions.validateToken({
          token,
          ipAddress,
          userAgent,
        });

      if (session === null) {
        logger.middleware(
          "AUTH",
          "Session validation failed - deleting cookie and returning 401",
          requestId
        );
        await deleteSessionTokenCookie(c);
        return c.json({ error: "Unauthorized" }, 401);
      }

      logger.middleware(
        "AUTH",
        `Session validated successfully - User: ${user.id}, Account: ${account.id}, Tenant: ${tenant.id}, Role: ${role.id}`,
        requestId,
        {
          userId: user.id,
          tenantId: tenant.id,
          accountId: account.id,
        }
      );

      // Set the values in context
      c.set("user_id", user.id);
      c.set("account_id", account.id);
      c.set("tenant_id", tenant.id);
      c.set("role_id", role.id);
      c.set("session", session);

      logger.middleware("AUTH", "Setting session token cookie", requestId);
      await setSessionTokenCookie(c, token, new Date(session.expires_at));

      const duration = Date.now() - startTime;
      logger.middleware(
        "AUTH",
        `Auth check completed successfully in ${duration}ms`,
        requestId
      );

      return next();
    } catch (error) {
      logger.middlewareError(
        "AUTH",
        "Error during session validation",
        requestId,
        error
      );
      await deleteSessionTokenCookie(c);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
