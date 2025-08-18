import {
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
  FORGOT_PASSWORD_ROUTE_PATH,
  RESET_PASSWORD_ROUTE_PATH,
  RESET_PASSWORD_VALIDATE_ROUTE_PATH,
  SIGN_IN_ROUTE_PATH,
  SIGN_UP_ROUTE_PATH,
} from "@pacetrack/schema";
import type { App } from "../../index";
import { logger } from "../helpers/logger";
import {
  apiRateLimit,
  authRateLimit,
  serveRateLimit,
} from "../helpers/rate-limiter";

// Rate limiting middleware (only enabled in production)
export async function rateLimitingMiddleware(app: App) {
  app.use("*", async (c, next) => {
    if (Bun.env.NODE_ENV !== "production") return next();

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware(
      "RATE_LIMIT",
      `${c.req.method} ${c.req.path} - Starting rate limit check`,
      requestId
    );

    if (Bun.env.NODE_ENV !== "production") {
      logger.middleware(
        "RATE_LIMIT",
        "Development mode - skipping rate limiting",
        requestId
      );
      return next();
    }

    logger.middleware(
      "RATE_LIMIT",
      "Production mode - applying rate limiting",
      requestId
    );

    // Auth routes - strict rate limiting by IP
    if (
      c.req.path === SIGN_IN_ROUTE_PATH ||
      c.req.path === SIGN_UP_ROUTE_PATH ||
      c.req.path === FORGOT_PASSWORD_ROUTE_PATH ||
      c.req.path === RESET_PASSWORD_ROUTE_PATH ||
      c.req.path === RESET_PASSWORD_VALIDATE_ROUTE_PATH ||
      c.req.path === CONFIRM_EMAIL_CHANGE_ROUTE_PATH
    ) {
      logger.middleware(
        "RATE_LIMIT",
        "Auth route detected - applying strict rate limiting",
        requestId
      );
      const result = await authRateLimit(c, next);
      const duration = Date.now() - startTime;
      logger.middleware(
        "RATE_LIMIT",
        `Auth rate limit check completed in ${duration}ms`,
        requestId
      );
      return result;
    }

    // Serve routes - generous rate limiting by IP
    if (c.req.path.startsWith("/serve/")) {
      logger.middleware(
        "RATE_LIMIT",
        "Serve route detected - applying generous rate limiting",
        requestId
      );
      const result = await serveRateLimit(c, next);
      const duration = Date.now() - startTime;
      logger.middleware(
        "RATE_LIMIT",
        `Serve rate limit check completed in ${duration}ms`,
        requestId
      );
      return result;
    }

    // Skip rate limiting for root
    if (c.req.path === "/") {
      logger.middleware(
        "RATE_LIMIT",
        "Root route - skipping rate limiting",
        requestId
      );
      return next();
    }

    // All other API routes - standard rate limiting by user ID
    logger.middleware(
      "RATE_LIMIT",
      "API route detected - applying standard rate limiting",
      requestId
    );
    const result = await apiRateLimit(c, next);
    const duration = Date.now() - startTime;
    logger.middleware(
      "RATE_LIMIT",
      `API rate limit check completed in ${duration}ms`,
      requestId
    );
    return result;
  });
}
