import { cors } from "hono/cors";
import {
  ALLOWED_CORS_ORIGIN_URLS,
  CORS_ALLOW_CREDENTIALS,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_EXPOSE_HEADERS,
} from "../../constants/cors";
import type { App } from "../../index";

// CORS Middleware using centralized configuration
export async function corsMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const handler = cors({
      origin: (origin: string) => {
        if (!origin) {
          return undefined;
        }
        if (ALLOWED_CORS_ORIGIN_URLS.length === 0) {
          return undefined;
        }

        const normalized = origin.replace(/\/$/, "").toLowerCase();
        if (ALLOWED_CORS_ORIGIN_URLS.includes(normalized)) {
          return origin;
        }

        return undefined;
      },
      credentials: CORS_ALLOW_CREDENTIALS,
      allowHeaders: CORS_ALLOWED_HEADERS,
      exposeHeaders: CORS_EXPOSE_HEADERS,
      allowMethods: CORS_ALLOWED_METHODS,
    });

    return handler(c, next);
  });
}
