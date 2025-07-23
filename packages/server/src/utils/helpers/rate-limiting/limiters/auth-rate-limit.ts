import { getClientIP } from "../../get-client-ip";
import { createRateLimiter } from "../rate-limiter-client";

// Auth routes - strict limits by IP (no authentication yet)
// 10 tokens max, refill 1 token every 30 seconds (allows ~2 requests/minute sustained)
export const authRateLimit = createRateLimiter({
  maxTokens: 10,
  refillIntervalSeconds: 30,
  keyGenerator: (c) => `auth:${getClientIP(c)}`,
  failClosed: true, // fail closed for auth routes
});
