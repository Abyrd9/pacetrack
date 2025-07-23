import { VALIDATE_SESSION_ROUTE } from "@pacetrack/schema";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { generateCSRFToken } from "src/utils/helpers/csrf/csrf";
import {
  deleteSessionTokenCookie,
  setCSRFTokenCookie,
} from "src/utils/helpers/csrf/csrf-cookie";
import { logger } from "src/utils/helpers/logger";

export function validateSessionRoute(app: App) {
  app.post(VALIDATE_SESSION_ROUTE.path, async (c) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware(
      "SESSION_VALIDATE",
      `Starting session validation`,
      requestId
    );

    try {
      const tenantId = c.get("tenant_id");

      logger.middleware(
        "SESSION_VALIDATE",
        `Tenant ID from context: ${tenantId || "undefined"}`,
        requestId
      );

      if (!tenantId) {
        logger.middleware(
          "SESSION_VALIDATE",
          "No tenant ID found in context - returning 401",
          requestId
        );
        return c.json(
          VALIDATE_SESSION_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      if (!process.env.SESSION_SECRET)
        throw new Error("SESSION_SECRET is not set");

      logger.middleware(
        "SESSION_VALIDATE",
        "Extracting session token from cookie",
        requestId
      );

      const token = await getSignedCookie(
        c,
        process.env.SESSION_SECRET,
        "pacetrack-session"
      );

      logger.middleware(
        "SESSION_VALIDATE",
        `Session token found: ${token ? "yes" : "no"}`,
        requestId
      );

      if (!token) {
        logger.middleware(
          "SESSION_VALIDATE",
          "No session token found - returning 401",
          requestId
        );
        return c.json(
          VALIDATE_SESSION_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global: "Unauthorized",
            },
          }),
          401
        );
      }

      const ipAddress =
        c.req.header("x-forwarded-for") ??
        c.req.header("x-real-ip") ??
        c.req.header("cf-connecting-ip") ??
        "";

      const userAgent = c.req.header("user-agent") ?? "";

      logger.middleware(
        "SESSION_VALIDATE",
        `Validating session token with IP: ${ipAddress}, User-Agent: ${userAgent.substring(0, 50)}...`,
        requestId
      );

      const session = await getSessionClient().validate({
        token,
        tenantId,
      });

      logger.middleware(
        "SESSION_VALIDATE",
        `Session validation result: ${session ? "valid" : "invalid"}`,
        requestId,
        {
          userId: session?.user_id,
          tenantId: session?.tenant_id,
        }
      );

      if (session === null) {
        logger.middleware(
          "SESSION_VALIDATE",
          "Session validation failed - deleting cookie and returning 401",
          requestId
        );
        await deleteSessionTokenCookie(c);
        return c.json(
          VALIDATE_SESSION_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global: "Unauthorized",
            },
          }),
          401
        );
      }

      logger.middleware(
        "SESSION_VALIDATE",
        "Session validation successful - refreshing cookies",
        requestId,
        {
          userId: session?.user_id,
          tenantId: session?.tenant_id,
        }
      );

      // Refresh the session cookie - convert number timestamp to Date
      await setSessionTokenCookie(c, token, new Date(session.expires_at));

      // Generate and set CSRF token cookie
      const csrfToken = await generateCSRFToken(token);
      await setCSRFTokenCookie(c, csrfToken, new Date(session.expires_at));

      logger.middleware(
        "SESSION_VALIDATE",
        "Session validation completed successfully",
        requestId
      );

      // Remove the secret hash from the session before sending to the client
      const { secret_hash, ...sessionWithoutSecretHash } = session;

      return c.json(
        VALIDATE_SESSION_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            user_id: session?.user_id,
            account_id: session?.account_id,
            tenant_id: session?.tenant_id,
            role_id: session?.role_id,
            session: {
              ...sessionWithoutSecretHash,
            },
          },
        }),
        200
      );
    } catch (error) {
      logger.middlewareError(
        "SESSION_VALIDATE",
        "Error during session validation",
        requestId,
        error
      );
      return c.json(
        VALIDATE_SESSION_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
