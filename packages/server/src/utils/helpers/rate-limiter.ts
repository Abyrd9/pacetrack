import type { RedisClient } from "bun";
import type { Context, Next } from "hono";
import { getRedisClient } from "./redis";

function getClientIP(c: Context): string {
	// Parse x-forwarded-for properly (comma-separated list)
	const forwardedFor = c.req.header("x-forwarded-for");
	if (forwardedFor) {
		// Take the first IP (original client)
		const firstIP = forwardedFor.split(",")[0].trim();
		if (firstIP) return firstIP;
	}

	return (
		c.req.header("x-real-ip") ?? c.req.header("cf-connecting-ip") ?? "unknown"
	);
}

interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyGenerator?: (c: Context) => string;
	failClosed?: boolean;
}

class RateLimiter {
	private redis: RedisClient;
	private config: RateLimitConfig;

	constructor(config: RateLimitConfig) {
		this.config = config;
		this.redis = getRedisClient();
	}

	async middleware(c: Context, next: Next) {
		const key = this.config.keyGenerator
			? this.config.keyGenerator(c)
			: this.getDefaultKey(c);

		// Simple sliding window with current timestamp
		const now = Date.now();
		const windowKey = `rate_limit:${key}:${Math.floor(
			now / this.config.windowMs,
		)}`;

		try {
			// Use atomic INCR + EXPIRE to avoid race conditions
			const current = await this.redis.incr(windowKey);

			if (current === 1) {
				// Set expiration only on first increment
				await this.redis.expire(
					windowKey,
					Math.ceil(this.config.windowMs / 1000),
				);
			}

			const remaining = Math.max(0, this.config.maxRequests - current);
			const ttl = await this.redis.ttl(windowKey);
			const resetTime = now + ttl * 1000;

			// Set rate limit headers
			c.header("X-RateLimit-Limit", this.config.maxRequests.toString());
			c.header("X-RateLimit-Remaining", remaining.toString());
			c.header("X-RateLimit-Reset", resetTime.toString());

			if (current > this.config.maxRequests) {
				const retryAfter = Math.ceil(ttl);
				return c.json(
					{
						error: "Too many requests",
						message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
						resetTime: new Date(resetTime).toISOString(),
					},
					429,
					{
						"Retry-After": retryAfter.toString(),
					},
				);
			}

			await next();
		} catch (error) {
			console.error("Rate limiter error:", error);

			if (this.config.failClosed) {
				// Fail closed for critical routes (auth)
				return c.json({ error: "Service temporarily unavailable" }, 503);
			}

			// Fail open for non-critical routes
			await next();
		}
	}

	private getDefaultKey(c: Context): string {
		const user = c.get("user");
		if (user) {
			return `user:${user.id}`;
		}

		return `ip:${getClientIP(c)}`;
	}
}

export function createRateLimiter(config: RateLimitConfig) {
	const limiter = new RateLimiter(config);
	return (c: Context, next: Next) => limiter.middleware(c, next);
}

// Auth routes - strict limits by IP (no authentication yet)
export const authRateLimit = createRateLimiter({
	windowMs: 5 * 60 * 1000, // 5 minutes
	maxRequests: 10, // 10 attempts per 5 minutes
	keyGenerator: (c) => `auth:${getClientIP(c)}`,
	failClosed: true, // fail closed for auth routes
});

// Serve routes - generous limits by IP (public file serving)
export const serveRateLimit = createRateLimiter({
	windowMs: 60 * 60 * 1000, // 1 hour
	maxRequests: 500, // 500 requests per hour
	keyGenerator: (c) => `serve:${getClientIP(c)}`,
	failClosed: false, // fail open for serve routes
});

// API routes - standard limits by user ID (authenticated routes)
export const apiRateLimit = createRateLimiter({
	windowMs: 5 * 60 * 1000, // 5 minutes
	maxRequests: 200, // 200 requests per 5 minutes
	keyGenerator: (c) => {
		const user = c.get("user");
		return user ? `api:${user.id}` : `api:${getClientIP(c)}`;
	},
	failClosed: false, // fail open for API routes
});
