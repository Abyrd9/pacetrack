import { getClientIP } from "../../get-client-ip";
import { createRateLimiter } from "../rate-limiter-client";

// Serve routes - conservative limits by IP (public file serving)
// 100 tokens max, refill 1 token every 36 seconds (allows ~100 requests/hour sustained)
export const serveRateLimit = createRateLimiter({
  maxTokens: 100,
  refillIntervalSeconds: 36, // ~100 tokens/hour = 1 token every 36 seconds
  keyGenerator: (c) => `serve:${getClientIP(c)}`,
  failClosed: false, // fail open for serve routes
});
