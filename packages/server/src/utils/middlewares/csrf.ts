import { getSignedCookie } from "hono/cookie";
import {
	PUBLIC_API_ROUTES,
	PUBLIC_WEB_ROUTES,
} from "src/constants/public-routes";
import type { App } from "../../index";
import { validateCSRFToken } from "../helpers/csrf";
import { logger } from "../helpers/logger";

// CSRF Protection Middleware
// Prevents Cross-Site Request Forgery attacks where malicious sites make requests on behalf of authenticated users
export async function csrfMiddleware(app: App) {
	app.use("*", async (c, next) => {
		const startTime = Date.now();
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware(
			"CSRF",
			`${c.req.method} ${c.req.path} - Starting CSRF check`,
			requestId,
		);

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
			logger.middleware(
				"CSRF",
				`Safe operation - skipping CSRF check (${c.req.method} ${c.req.path})`,
				requestId,
			);
			return next();
		}

		logger.middleware(
			"CSRF",
			"State-changing operation - validating CSRF token",
			requestId,
		);

		// For state-changing operations (POST/PUT/DELETE), validate CSRF token
		// CSRF token can be sent via header or query parameter
		const csrfToken = c.req.header("x-csrf-token") || c.req.query("csrf_token");

		if (!csrfToken) {
			logger.middleware(
				"CSRF",
				"No CSRF token found in header or query",
				requestId,
			);
		} else {
			logger.middleware(
				"CSRF",
				`CSRF token found (${csrfToken.substring(0, 10)}...)`,
				requestId,
			);
		}

		// Get the session token from the signed cookie
		logger.middleware(
			"CSRF",
			"Extracting session token from cookie",
			requestId,
		);
		const sessionToken = await getSignedCookie(
			c,
			Bun.env.SESSION_SECRET || "",
			"pacetrack-session",
		);

		if (!sessionToken) {
			logger.middleware("CSRF", "No session token found", requestId);
		} else {
			logger.middleware(
				"CSRF",
				`Session token found (${sessionToken.substring(0, 10)}...)`,
				requestId,
			);
		}

		// Both CSRF token and session token are required
		if (!csrfToken || !sessionToken) {
			logger.middleware(
				"CSRF",
				`Missing required tokens - CSRF: ${!!csrfToken}, Session: ${!!sessionToken}`,
				requestId,
			);
			return c.json(
				{
					key: c.req.path,
					status: "error",
					errors: { global: "CSRF token required" },
				},
				403,
			);
		}

		// Validate that the CSRF token matches what we expect for this session
		// The CSRF token is derived from the session token, so only legitimate requests can have valid tokens
		logger.middleware(
			"CSRF",
			"Validating CSRF token against session token",
			requestId,
		);
		try {
			const isValid = await validateCSRFToken(csrfToken, sessionToken);

			if (!isValid) {
				logger.middleware("CSRF", "CSRF token validation failed", requestId);
				return c.json(
					{
						key: c.req.path,
						status: "error",
						errors: { global: "Invalid CSRF token" },
					},
					403,
				);
			}

			const duration = Date.now() - startTime;
			logger.middleware(
				"CSRF",
				`CSRF validation successful in ${duration}ms`,
				requestId,
			);

			return next();
		} catch (error) {
			logger.middlewareError(
				"CSRF",
				"Error during CSRF validation",
				requestId,
				error,
			);
			return c.json(
				{
					key: c.req.path,
					status: "error",
					errors: { global: "CSRF validation error" },
				},
				500,
			);
		}
	});
}
