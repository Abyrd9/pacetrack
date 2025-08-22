import { cors } from "hono/cors";
import {
  ALLOWED_CORS_ORIGINS,
  CORS_ALLOW_CREDENTIALS,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_EXPOSE_HEADERS,
} from "../../constants/cors";
import type { App } from "../../index";
import { logger } from "../helpers/logger";

// CORS Middleware using centralized configuration
export async function corsMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware(
      "CORS",
      `${c.req.method} ${c.req.path} - Evaluating CORS`,
      requestId
    );

    logger.middleware("CORS", `HEADERS: ${c.req.header("cookie")}`, requestId);

    const handler = cors({
      origin: (origin: string) => {
        if (!origin) {
          logger.middleware(
            "CORS",
            "No Origin header - same-origin/server-to-server",
            requestId
          );
          return undefined;
        }
        if (ALLOWED_CORS_ORIGINS.length === 0) {
          logger.middleware(
            "CORS",
            "ALLOWED_CORS_ORIGINS empty - allow same-origin only",
            requestId
          );
          return undefined;
        }

        const normalized = origin.replace(/\/$/, "").toLowerCase();
        if (ALLOWED_CORS_ORIGINS.includes(normalized)) {
          logger.middleware("CORS", `Origin allowed: ${origin}`, requestId);
          return origin;
        }

        logger.middleware("CORS", `Origin blocked: ${origin}`, requestId);
        return undefined;
      },
      credentials: CORS_ALLOW_CREDENTIALS,
      allowHeaders: CORS_ALLOWED_HEADERS,
      exposeHeaders: CORS_EXPOSE_HEADERS,
      allowMethods: CORS_ALLOWED_METHODS,
    });

    const result = await handler(c, next);

    const duration = Date.now() - startTime;
    logger.middleware(
      "CORS",
      `CORS evaluation completed in ${duration}ms`,
      requestId
    );

    return result;
  });
}
