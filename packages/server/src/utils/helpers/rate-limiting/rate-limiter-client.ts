import type { RedisClient } from "bun";
import type { Context, Next } from "hono";
import { getRedisClient } from "../redis";
import { TOKEN_BUCKET_SCRIPT } from "./script";

type RateLimitConfig = {
  // Token bucket configuration
  maxTokens: number;
  refillIntervalSeconds: number;
  keyGenerator?: (c: Context) => string;
  failClosed?: boolean;
};

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

class RateLimiter {
  private redis: RedisClient;
  private config: RateLimitConfig;
  private script: string | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.redis = getRedisClient();
  }

  private async loadScript(): Promise<string> {
    if (this.script) return this.script;

    // Load the Lua script using Bun's raw command support
    const result = await this.redis.send("SCRIPT", [
      "LOAD",
      TOKEN_BUCKET_SCRIPT,
    ]);
    this.script = result as string;
    return this.script;
  }

  async consume(key: string, cost: number = 1): Promise<boolean> {
    const storageKey = `token_bucket:${key}`;
    const scriptSha = await this.loadScript();

    try {
      // Use EVALSHA for atomic execution
      const result = await this.redis.send("EVALSHA", [
        scriptSha,
        "1", // number of keys
        storageKey, // key
        this.config.maxTokens.toString(),
        this.config.refillIntervalSeconds.toString(),
        cost.toString(),
        Date.now().toString(),
      ]);

      // Lua script returns 1 for allowed, 0 for denied
      return result === 1;
    } catch (error) {
      console.error("Token bucket Redis error:", error);
      // Fail open if Redis fails
      return true;
    }
  }

  async getBucketInfo(
    key: string
  ): Promise<{ count: number; refilledAt: number } | null> {
    const storageKey = `token_bucket:${key}`;

    try {
      // Use HMGET to get both fields atomically
      const fields = await this.redis.hmget(storageKey, [
        "count",
        "refilled_at_ms",
      ]);

      if (!fields || !fields[0] || !fields[1]) return null;

      return {
        count: parseInt(fields[0], 10),
        refilledAt: parseInt(fields[1], 10),
      };
    } catch (error) {
      console.error("Error getting bucket info:", error);
      return null;
    }
  }

  async middleware(c: Context, next: Next) {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(c)
      : this.getDefaultKey(c);

    const allowed = await this.consume(key, 1);

    if (!allowed) {
      // Get bucket info for retry-after calculation
      const bucketInfo = await this.getBucketInfo(key);
      let retryAfter = this.config.refillIntervalSeconds;

      if (bucketInfo) {
        const now = Date.now();
        const timeUntilRefill =
          bucketInfo.refilledAt +
          this.config.refillIntervalSeconds * 1000 -
          now;
        retryAfter = Math.max(1, Math.ceil(timeUntilRefill / 1000));
      }

      return c.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        },
        429,
        {
          "Retry-After": retryAfter.toString(),
        }
      );
    }

    // Set rate limit headers
    const bucketInfo = await this.getBucketInfo(key);
    if (bucketInfo) {
      c.header("X-RateLimit-Limit", this.config.maxTokens.toString());
      c.header("X-RateLimit-Remaining", bucketInfo.count.toString());

      const nextRefill =
        bucketInfo.refilledAt + this.config.refillIntervalSeconds * 1000;
      c.header("X-RateLimit-Reset", nextRefill.toString());
    }

    try {
      await next();
    } catch (error) {
      console.error("Rate limiter error:", error);

      if (this.config.failClosed) {
        return c.json({ error: "Service temporarily unavailable" }, 503);
      }

      throw error;
    }
  }

  private getDefaultKey(c: Context): string {
    // See index.ts for context variables
    const userId = c.get("user_id");
    if (userId) return `user:${userId}`;

    return `ip:${getClientIP(c)}`;
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  return (c: Context, next: Next) => limiter.middleware(c, next);
}
