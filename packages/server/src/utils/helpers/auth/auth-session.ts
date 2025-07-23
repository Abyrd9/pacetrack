import type { Session } from "@pacetrack/schema";
import { getRedisClient } from "../redis";

const SESSION_EXPIRATION_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ACTIVITY_CHECK_INTERVAL_SECONDS = 60 * 60; // 1 hour

class AuthSession {
  /**
   * Generates a secure random string
   * @returns A secure random string
   */
  private generateSecureRandomString() {
    // Human readable alphabet (a-z, 0-9 without l, o, 0, 1 to avoid confusion)
    const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

    // Generate 24 bytes = 192 bits of entropy.
    // We're only going to use 5 bits per byte so the total entropy will be 192 * 5 / 8 = 120 bits
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);

    let id = "";
    for (let i = 0; i < bytes.length; i++) {
      // >> 3 "removes" the right-most 3 bits of the byte
      id += alphabet[bytes[i] >> 3];
    }
    return id;
  }

  /**
   * Creates a session token
   * @returns A session ID, session secret hash, and session token
   */
  async createSessionToken() {
    const id = this.generateSecureRandomString();
    const secret = this.generateSecureRandomString();
    const secretHash = await this.hashSessionSecret(secret);

    const token = `${id}.${secret}`;

    return {
      sessionId: id,
      sessionSecretHash: secretHash,
      sessionToken: token,
    };
  }

  /**
   * Hash session secret using SHA-256
   * @param secret - The session secret to hash
   * @returns The hashed session secret
   */
  private async hashSessionSecret(secret: string): Promise<string> {
    const secretBytes = new TextEncoder().encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert to hex string for storage
    return Array.from(hashArray)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Constant-time comparison for security
   * Prevents timing attacks when comparing hashes
   * @param a - The first string to compare
   * @param b - The second string to compare
   * @returns True if the strings are equal, false otherwise
   */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Creates a session
   * @param sessionId - The ID of the session
   * @param sessionSecretHash - The secret hash of the session
   * @param userId - The ID of the user
   * @param accountId - The ID of the account
   * @param tenantId - The ID of the tenant
   * @param roleId - The ID of the role
   * @returns The session
   */
  async create({
    sessionId,
    sessionSecretHash,
    userId,
    accountId,
    tenantId,
    roleId,
  }: {
    sessionId: string;
    sessionSecretHash: string;
    userId: string;
    accountId: string;
    tenantId: string;
    roleId: string;
  }) {
    const redis = getRedisClient();

    const now = Date.now();
    const expiresAt = now + SESSION_EXPIRATION_SECONDS * 1000; // 30 days

    const session: Session = {
      id: sessionId,
      secret_hash: sessionSecretHash,
      user_id: userId,
      account_id: accountId,
      tenant_id: tenantId,
      role_id: roleId,
      expires_at: expiresAt,
      created_at: now,
      last_verified_at: now,
      revoked_at: null,
    };

    // Store session in Redis with TTL
    await redis.set(`session:${sessionId}`, JSON.stringify(session));
    await redis.expire(
      `session:${sessionId}`,
      Math.ceil((expiresAt - now) / 1000) // 30 days
    );

    // Add to user's session set for bulk operations
    await redis.sadd(`user_sessions:${userId}`, sessionId);

    return session;
  }

  /**
   * Validates a session
   * @param token - The session token
   * @param tenantId - The ID of the tenant
   * @returns The session
   */
  async validate({
    token,
    tenantId,
  }: {
    token: string;
    tenantId?: string;
  }): Promise<Session | null> {
    const redis = getRedisClient();

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [sessionId, sessionSecret] = parts;

    if (!sessionId || !sessionSecret) return null;

    try {
      const result = await redis.get(`session:${sessionId}`);
      if (!result) return null;

      let session: Session = JSON.parse(result);

      // Check if session is revoked
      if (session.revoked_at !== null) return null;

      // Check if session is expired
      if (Date.now() >= session.expires_at) {
        await redis.del(`session:${sessionId}`);
        await redis.srem(`user_sessions:${session.user_id}`, sessionId);
        return null;
      }

      const expectedHash = await this.hashSessionSecret(sessionSecret);
      const isValid = this.constantTimeEqual(expectedHash, session.secret_hash);

      if (!isValid) return null;

      let shouldUpdateRedisSession = false;

      // Check if we should update last verified at
      const now = Date.now();
      if (
        now - session.last_verified_at >
        ACTIVITY_CHECK_INTERVAL_SECONDS * 1000
      ) {
        shouldUpdateRedisSession = true;
        session = {
          ...session,
          last_verified_at: now,
        };
      }

      // Only update if explicitly provided and different from current
      if (tenantId && tenantId !== session.tenant_id) {
        shouldUpdateRedisSession = true;
        session.tenant_id = tenantId;
      }

      // Check if session needs renewal (< 15 days remaining)
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      if (session.expires_at - now < fifteenDaysMs) {
        shouldUpdateRedisSession = true;
        session.expires_at = now + 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      // Update Redis with new activity and expiration
      if (shouldUpdateRedisSession) {
        await redis.set(`session:${sessionId}`, JSON.stringify(session));
        await redis.expire(
          `session:${sessionId}`,
          Math.ceil((session.expires_at - now) / 1000) // 30 days
        );
      }

      return session;
    } catch (error) {
      console.error("Error getting session from Redis:", error);
      return null;
    }
  }

  /**
   * Gets the session ID from a token
   * @param token - The token to get the session ID from
   * @returns The session ID or null if not found
   */
  getSessionIdFromToken(token: string) {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    return parts[0];
  }

  /**
   * Invalidates a session
   * @param sessionId - The ID of the session to invalidate
   */
  async invalidate({ sessionId }: { sessionId: string }) {
    try {
      const redis = getRedisClient();

      const result = await redis.get(`session:${sessionId}`);
      if (!result) return null;

      let session: Session = JSON.parse(result);
      session = {
        ...session,
        revoked_at: Date.now(),
      };

      await redis.set(`session:${sessionId}`, JSON.stringify(session));
      await redis.expire(`session:${sessionId}`, 24 * 60 * 60); // 24 hours

      await redis.srem(`user_sessions:${session.user_id}`, sessionId);

      return session;
    } catch (error) {
      console.error("Error invalidating session in Redis:", error);
      return null;
    }
  }

  /**
   * Invalidates all sessions for a user
   * @param userId - The ID of the user whose sessions to invalidate
   */
  async invalidateAllUserSessions({ userId }: { userId: string }) {
    const redis = getRedisClient();
    const sessionIds = await redis.smembers(`user_sessions:${userId}`);
    for (const sessionId of sessionIds) {
      await this.invalidate({ sessionId });
    }
  }

  /**
   * Gets the latest active session for a user
   * @param userId - The ID of the user whose latest session to get
   * @returns The latest Session object or null if no active sessions exist
   */
  async getLatestSession({ userId }: { userId: string }) {
    const redis = getRedisClient();
    const sessionIds = await redis.smembers(`user_sessions:${userId}`);

    if (sessionIds.length === 0) return null;

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = await redis.get(`session:${sessionId}`);
      if (session) {
        const parsed: Session = JSON.parse(session);
        if (parsed.revoked_at === null) sessions.push(parsed);
      }
    }

    if (sessions.length === 0) return null;

    const latest = sessions.sort(
      (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
    )[0];

    return latest;
  }

  /**
   * Gets a session by ID
   * @param sessionId - The ID of the session to get
   * @returns The session or null if not found or revoked
   */
  async getSession({ sessionId }: { sessionId: string }) {
    try {
      const redis = getRedisClient();

      const result = await redis.get(`session:${sessionId}`);
      if (!result) return null;

      const session: Session = JSON.parse(result);
      if (session.revoked_at != null) return null;

      return session;
    } catch (error) {
      console.error("Error getting session from Redis:", error);
      return null;
    }
  }

  /**
   * Lists all sessions for a user
   * @param userId - The ID of the user whose sessions to list
   * @returns The list of sessions
   */
  async listUserSessions({ userId }: { userId: string }) {
    const redis = getRedisClient();
    const sessionIds = await redis.smembers(`user_sessions:${userId}`);

    if (sessionIds.length === 0) return [];

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = await redis.get(`session:${sessionId}`);
      if (session) {
        const parsed: Session = JSON.parse(session);
        if (parsed.revoked_at === null) sessions.push(parsed);
      }
    }

    return sessions;
  }

  /**
   * Updates the tenant for a specific session
   * @param sessionId - The ID of the session to update
   * @param tenantId - The new tenant ID for the session
   * @returns The updated Session object
   */
  async updateSessionTenant({
    sessionId,
    tenantId,
  }: {
    sessionId: string;
    tenantId: string;
  }) {
    try {
      const redis = getRedisClient();
      const result = await redis.get(`session:${sessionId}`);
      if (!result) return null;

      let session: Session = JSON.parse(result);
      session = {
        ...session,
        tenant_id: tenantId,
        last_verified_at: Date.now(),
      };

      await redis.set(`session:${sessionId}`, JSON.stringify(session));
      await redis.expire(
        `session:${sessionId}`,
        Math.ceil((session.expires_at - Date.now()) / 1000) // Set TTL based on expiration
      );

      return session;
    } catch (error) {
      console.error("Error updating session tenant in Redis:", error);
      return null;
    }
  }

  /**
   * Updates the account for a specific session
   * @param sessionId - The ID of the session to update
   * @param accountId - The new account ID for the session
   * @param tenantId - The new tenant ID for the session
   * @returns The updated Session object
   */
  async updateSessionAccount({
    sessionId,
    accountId,
    tenantId,
  }: {
    sessionId: string;
    accountId: string;
    tenantId: string;
  }) {
    try {
      const redis = getRedisClient();
      const result = await redis.get(`session:${sessionId}`);
      if (!result) return null;

      let session: Session = JSON.parse(result);
      session = {
        ...session,
        account_id: accountId,
        tenant_id: tenantId,
        last_verified_at: Date.now(),
      };

      await redis.set(`session:${sessionId}`, JSON.stringify(session));
      await redis.expire(
        `session:${sessionId}`,
        Math.ceil((session.expires_at - Date.now()) / 1000) // Set TTL based on expiration
      );

      return session;
    } catch (error) {
      console.error("Error updating session account in Redis:", error);
      return null;
    }
  }
}

let AuthSessionClient: AuthSession;

export const getSessionClient = () => {
  if (!AuthSessionClient) {
    AuthSessionClient = new AuthSession();
  }
  return AuthSessionClient;
};
