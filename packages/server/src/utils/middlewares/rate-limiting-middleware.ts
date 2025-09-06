import { PUBLIC_API_ROUTES } from "src/constants/public-routes";
import type { App } from "../../index";
import { apiRateLimit } from "../helpers/rate-limiting/limiters/api-rate-limit";
import { authRateLimit } from "../helpers/rate-limiting/limiters/auth-rate-limit";
import { serveRateLimit } from "../helpers/rate-limiting/limiters/serve-rate-limit";
import { getRecordFunction } from "../helpers/timing/get-record-function";

const record = getRecordFunction({
  name: "rate-limit-middleware",
  description: "Rate limiting middleware duration",
});

// Rate limiting middleware (only enabled in production)
export async function rateLimitingMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const startTime = performance.now();

    try {
      if (Bun.env.NODE_ENV !== "production") return await next();

      // Auth routes - strict rate limiting by IP
      if (PUBLIC_API_ROUTES.includes(c.req.path)) {
        const result = await authRateLimit(c, next);
        record(c, startTime);
        return result;
      }

      // Serve routes - generous rate limiting by IP
      if (c.req.path.startsWith("/serve/")) {
        const result = await serveRateLimit(c, next);
        record(c, startTime);
        return result;
      }

      // Skip rate limiting for root
      if (c.req.path === "/") {
        record(c, startTime);
        await next();
      }

      // All other API routes - standard rate limiting by user ID
      const result = await apiRateLimit(c, next);
      record(c, startTime);

      return result;
    } catch (error) {
      record(c, startTime);
      throw error;
    }
  });
}
