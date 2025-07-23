import { getClientIP } from "../../get-client-ip";
import { createRateLimiter } from "../rate-limiter-client";

// API routes - standard limits by user ID (authenticated routes)
// 200 tokens max, refill 1 token every 1.5 seconds (allows ~200 requests/5 minutes sustained)
export const apiRateLimit = createRateLimiter({
  maxTokens: 200,
  refillIntervalSeconds: 2, // ~200 tokens/5 minutes = 1 token every 1.5 seconds (rounded up)
  keyGenerator: (c) => {
    // See index.ts for context variables
    const userId = c.get("user_id");
    return userId ? `api:${userId}` : `api:${getClientIP(c)}`;
  },
  failClosed: false, // fail open for API routes
});
