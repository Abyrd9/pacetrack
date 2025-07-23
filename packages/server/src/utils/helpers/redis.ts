import { RedisClient } from "bun";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // base delay: 1 second
const MAX_RETRY_DELAY = 30000; // cap at 30 seconds
const BACKOFF_JITTER = 0.2; // +/-20%

class RedisConnectionManager {
  private client: RedisClient | null;
  private isHealthy: boolean;
  private retryCount: number;
  private lastRetry: number;
  private connecting?: Promise<void>;

  constructor() {
    this.client = null;
    this.isHealthy = false;
    this.retryCount = 0;
    this.lastRetry = 0;
  }

  private createRedisClient(): RedisClient | null {
    const url = process.env.REDIS_URL || "redis://localhost:6379";

    try {
      const client = new RedisClient(url);
      this.client = client;
      this.isHealthy = false; // not healthy until ping passes
      this.retryCount = 0;
      this.lastRetry = 0;
      // start background health check if not already running
      this.startHealthCheckIfNeeded();

      return client;
    } catch (error) {
      console.error("Failed to create Redis client:", error);
      this.isHealthy = false;
      this.retryCount++;
      this.lastRetry = Date.now();

      return null;
    }
  }

  getRedisClient(): RedisClient {
    if (!this.client) {
      const created = this.createRedisClient();
      if (!created) throw new Error("Failed to create Redis client");
      return created;
    }
    if (!this.isHealthy) {
      this.startHealthCheckIfNeeded();
    }
    return this.client;
  }

  private startHealthCheckIfNeeded() {
    if (this.connecting || !this.client) return;
    this.connecting = this.testRedisConnection(this.client)
      .then(() => {
        this.isHealthy = true;
        this.retryCount = 0;
      })
      .catch((err) => {
        this.isHealthy = false;
        this.retryCount++;
        this.lastRetry = Date.now();
        const code = (err as { code?: string } | undefined)?.code;
        if (code) {
          console.error("Redis initial connection test failed:", code, err);
        } else {
          console.error("Redis initial connection test failed:", err);
        }
      })
      .finally(() => {
        this.connecting = undefined;
      });
  }

  private getNextBackoffDelayMs(): number {
    const base = Math.min(RETRY_DELAY * 2 ** this.retryCount, MAX_RETRY_DELAY);
    const jitterFactor = 1 + (Math.random() * 2 - 1) * BACKOFF_JITTER;
    return Math.max(250, Math.floor(base * jitterFactor));
  }

  async testRedisConnection(passedInClient?: RedisClient): Promise<void> {
    if (passedInClient) {
      await passedInClient.ping();
    } else if (this.client) {
      await this.client.ping();
    } else {
      throw new Error("No Redis client available for testing");
    }
  }

  async checkRedisHealth(): Promise<boolean> {
    try {
      if (!this.client || !this.isHealthy) {
        this.startHealthCheckIfNeeded();
        return false;
      }

      await this.client.ping();
      this.isHealthy = true;
      return true;
    } catch (error) {
      console.error("Redis health check failed:", error);
      this.isHealthy = false;

      // Attempt to reconnect if unhealthy
      if (this.retryCount < MAX_RETRIES) {
        const timeSinceLastRetry = Date.now() - this.lastRetry;
        const backoffDelay = this.getNextBackoffDelayMs();
        if (timeSinceLastRetry > backoffDelay) {
          console.log(
            `Attempting Redis reconnection (${this.retryCount + 1}/${MAX_RETRIES}) after ${backoffDelay}ms`
          );
          this.lastRetry = Date.now();
          try {
            if (!this.client) {
              this.createRedisClient();
            } else {
              this.startHealthCheckIfNeeded();
            }
          } catch {
            // ignore; will retry on next cycle
          }
        }
      }

      return false;
    }
  }

  // Convenience for metrics/logging without a ping
  isReady(): boolean {
    return Boolean(this.client) && this.isHealthy;
  }

  closeRedisConnection(): void {
    if (this.client) {
      // Bun's RedisClient doesn't have a close method, so we just null it out
      this.client = null;
      this.isHealthy = false;
      this.retryCount = 0;
      this.lastRetry = 0;
    }
  }
}

// Singleton instance
const manager = new RedisConnectionManager();

// Export functions that maintain the same API as before
export function getRedisClient(): RedisClient {
  return manager.getRedisClient();
}

export async function checkRedisHealth(): Promise<boolean> {
  return manager.checkRedisHealth();
}

export function closeRedisConnection(): void {
  manager.closeRedisConnection();
}

/**
 * Checks if an error is a Redis connection error that should trigger retry/fallback behavior
 * @param error - The error to check (can be Error object or string)
 * @returns true if this is a Redis connection error, false otherwise
 */
export function isRedisConnectionError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | undefined;
  const code = e?.code ?? "";
  const msg = (e?.message ?? String(error)).toLowerCase();

  const codeSet = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EPIPE",
    "ENOTFOUND",
    "EHOSTUNREACH",
    "ENETUNREACH",
  ]);
  if (code && codeSet.has(code)) return true;

  return [
    "err_redis_connection_closed",
    "connection has failed",
    "redis connection lost",
    "connection refused",
  ].some((p) => msg.includes(p));
}
