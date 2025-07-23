import { SIGN_IN_ROUTE_PATH } from "@pacetrack/schema";
import { beforeAll, describe, expect, test } from "bun:test";
import app from "../..";
import { resetDb } from "./reset-db";
import { makeAuthenticatedRequest, setTestSession } from "./set-test-session";

beforeAll(async () => {
	await resetDb();
});

describe("Rate Limiting (Integration)", () => {
	// Note: Rate limiting is disabled in test environment (NODE_ENV=test)
	// These tests verify the middleware exists and doesn't break functionality

	describe("Auth Routes", () => {
		test("should not rate limit auth routes in test environment", async () => {
			const form = new FormData();
			form.append("email", "test@example.com");
			form.append("password", "wrongpassword");

			// Make multiple requests - should not be rate limited in test env
			for (let i = 0; i < 10; i++) {
				const response = await app.request(SIGN_IN_ROUTE_PATH, {
					method: "POST",
					body: form,
					headers: {
						"x-forwarded-for": "192.168.1.1",
					},
				});

				// Should get validation error, not rate limit error
				expect(response.status).toBe(400);
				expect(response.headers.get("x-ratelimit-limit")).toBeNull();
			}
		});
	});

	describe("API Routes", () => {
		test("should not rate limit API routes in test environment", async () => {
			const { cookie, csrfToken } = await setTestSession();

			// Make multiple requests - should not be rate limited in test env
			for (let i = 0; i < 10; i++) {
				const response = await app.request("/api/session/validate", {
					method: "POST",
					headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
						"x-forwarded-for": "192.168.1.2",
					}),
					body: JSON.stringify({}),
				});

				expect(response.status).toBe(200);
				expect(response.headers.get("x-ratelimit-limit")).toBeNull();
			}
		});
	});

	describe("Serve Routes", () => {
		test("should not rate limit serve routes in test environment", async () => {
			// Make multiple requests - should not be rate limited in test env
			for (let i = 0; i < 10; i++) {
				const response = await app.request("/serve/test-file", {
					method: "GET",
					headers: {
						"x-forwarded-for": "192.168.1.3",
					},
				});

				// File doesn't exist, but not rate limited
				expect(response.status).not.toBe(429);
				expect(response.headers.get("x-ratelimit-limit")).toBeNull();
			}
		});
	});

	describe("Rate Limiter Middleware Configuration", () => {
		test("should have rate limiting middleware configured for production", () => {
			// This test verifies the middleware is properly configured
			// In production (NODE_ENV !== "test"), rate limiting would be active

			// We can't easily test the actual rate limiting without changing NODE_ENV
			// but we can verify the middleware functions exist
			const {
				authRateLimit,
				serveRateLimit,
				apiRateLimit,
			} = require("../helpers/rate-limiter");

			expect(typeof authRateLimit).toBe("function");
			expect(typeof serveRateLimit).toBe("function");
			expect(typeof apiRateLimit).toBe("function");
		});
	});
});

// Manual test instructions for production rate limiting:
/*
To test rate limiting in production/development:

1. Start Redis: docker-compose up redis -d
2. Set NODE_ENV=development (or remove NODE_ENV)
3. Start server: bun run dev
4. Test auth rate limiting:
   curl -X POST http://localhost:4000/auth/sign-in \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -H "X-Forwarded-For: 192.168.1.100" \
     -d "email=test@example.com&password=wrong"
   
   Repeat 6 times - 6th request should return 429

5. Test API rate limiting (need valid session):
   curl -X POST http://localhost:4000/api/session/validate \
     -H "Cookie: pacetrack-session=your-session-token" \
     -H "X-Forwarded-For: 192.168.1.101"
   
   Repeat 101 times - 101st request should return 429

6. Test serve rate limiting:
   curl http://localhost:4000/serve/test-file \
     -H "X-Forwarded-For: 192.168.1.102"
   
   Repeat 501 times - 501st request should return 429
*/
