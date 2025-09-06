import { getSignedCookie } from "hono/cookie";
import {
  PUBLIC_API_ROUTES,
  PUBLIC_WEB_ROUTES,
} from "src/constants/public-routes";
import type { App } from "../../index";
import { validateCSRFToken } from "../helpers/csrf/csrf";
import { getRecordFunction } from "../helpers/timing/get-record-function";

const record = getRecordFunction({
  name: "csrf-middleware",
  description: "CSRF middleware duration",
});

// CSRF Protection Middleware
// Prevents Cross-Site Request Forgery attacks where malicious sites make requests on behalf of authenticated users
export async function csrfMiddleware(app: App) {
  app.use("*", async (c, next) => {
    const startTime = performance.now();

    try {
      const requestOriginUrl = c.req.header("x-request-origin");
      const path = requestOriginUrl || "";

      // Skip CSRF validation for safe operations
      // GET requests are read-only and don't change state
      // Public routes (auth endpoints) don't need CSRF protection
      if (
        c.req.method === "GET" || // Read-only operations are safe
        PUBLIC_API_ROUTES.includes(c.req.path) ||
        PUBLIC_WEB_ROUTES.includes(path) ||
        c.req.path.startsWith("/serve/") || // File serving is read-only
        c.req.path === "/" // Root endpoint
      ) {
        record(c, startTime);
        return await next();
      }

      // Server-to-server/SSR cases
      const origin = c.req.header("origin") || "";
      if (!origin) {
        record(c, startTime);
        return await next();
      }

      // If authorization header is present, skip CSRF validation
      // It means we're doing a server-to-server request, not vulnerable to CSRF attacks since no cookies are sent
      // CSRF relies on browser auto-sending cookies
      const authorization = c.req.header("authorization") || "";
      if (authorization) {
        record(c, startTime);
        return await next();
      }

      // For state-changing operations (POST/PUT/DELETE), validate CSRF token
      // CSRF token can be sent via header or query parameter
      const csrfToken =
        c.req.header("x-csrf-token") || c.req.query("csrf_token");

      // Get the session token from the signed cookie
      const sessionToken = await getSignedCookie(
        c,
        Bun.env.SESSION_SECRET || "",
        "pacetrack-session"
      );

      // Both CSRF token and session token are required
      if (!csrfToken || !sessionToken) {
        record(c, startTime);
        return c.json(
          {
            key: c.req.path,
            status: "error",
            errors: { global: "CSRF token required" },
          },
          403
        );
      }

      // Validate that the CSRF token matches what we expect for this session
      // The CSRF token is derived from the session token, so only legitimate requests can have valid tokens
      const isValid = await validateCSRFToken(csrfToken, sessionToken);

      if (!isValid) {
        record(c, startTime);
        return c.json(
          {
            key: c.req.path,
            status: "error",
            errors: { global: "Invalid CSRF token" },
          },
          403
        );
      }

      record(c, startTime);
      const result = await next();

      return result;
    } catch {
      record(c, startTime);

      return c.json(
        {
          key: c.req.path,
          status: "error",
          errors: { global: "CSRF validation error" },
        },
        500
      );
    }
  });
}
