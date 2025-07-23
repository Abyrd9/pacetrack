import { RedisClient } from "bun";

// Singleton Redis client to avoid connection leaks
let redis: RedisClient | null = null;

export function getRedisClient(): RedisClient {
	if (!redis) {
		redis = new RedisClient(Bun.env.REDIS_URL || "redis://localhost:6379");
	}
	return redis;
}
