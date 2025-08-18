import { sha256 } from "@oslojs/crypto/sha2";
import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
} from "@oslojs/encoding";
import type { Session } from "@pacetrack/schema";
import { getRedisClient } from "./redis";

// Redis session storage schema:
// session:{sessionId} -> JSON session data
// user_sessions:{userId} -> SET of sessionIds for bulk invalidation
// session_tenant:{sessionId} -> tenantId for quick tenant lookup

export const sessions = {
	/**
	 * Generates a session ID from a token using SHA256 hash
	 * @param token - The session token to hash
	 * @returns The hex-encoded session ID
	 */
	getSessionIdFromToken: (token: string) => {
		return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	},

	/**
	 * Generates a cryptographically secure random token for session authentication
	 * @returns A base32-encoded token string
	 */
	generateToken: () => {
		const bytes = new Uint8Array(20);
		crypto.getRandomValues(bytes);
		const token = encodeBase32LowerCaseNoPadding(bytes);
		return token;
	},

	/**
	 * Validates a session token and returns session/user/tenant/role information
	 * @param token - The session token to validate
	 * @param tenantId - Optional tenant ID to switch to (for tenant switching)
	 * @param ipAddress - Current IP address for session tracking
	 * @param userAgent - Current user agent for session tracking
	 * @returns Object containing session, user, tenant, and role IDs (no database queries)
	 */
	validateToken: async ({
		token,
		tenantId,
		ipAddress,
		userAgent,
	}: {
		token: string;
		tenantId?: string;
		ipAddress?: string | null;
		userAgent?: string | null;
	}) => {
		const redis = getRedisClient();
		const sessionId = encodeHexLowerCase(
			sha256(new TextEncoder().encode(token)),
		);

		try {
			// Get session from Redis
			const sessionData = await redis.get(`session:${sessionId}`);
			if (!sessionData) {
				return { session: null, user: null, tenant: null, role: null };
			}

			const redisSession: Session = JSON.parse(sessionData);

			// Check if session is revoked
			if (redisSession.revoked_at !== null) {
				return { session: null, user: null, tenant: null, role: null };
			}

			// Check if session is expired
			if (Date.now() >= redisSession.expires_at) {
				// Clean up expired session
				await redis.del(`session:${sessionId}`);
				await redis.srem(`user_sessions:${redisSession.user_id}`, sessionId);
				return { session: null, user: null, tenant: null, role: null };
			}

			// Update session activity in Redis (fire-and-forget)
			const now = Date.now();
			const updatedSession: Session = {
				...redisSession,
				last_activity: now,
				...(ipAddress ? { ip_address: ipAddress } : {}),
				...(userAgent ? { user_agent: userAgent } : {}),
			};

			// Only update tenant if explicitly provided and different from current
			if (tenantId && tenantId !== redisSession.tenant_id) {
				updatedSession.tenant_id = tenantId;
			}

			// Check if session needs renewal (< 15 days remaining)
			const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
			if (redisSession.expires_at - now < fifteenDaysMs) {
				updatedSession.expires_at = now + 30 * 24 * 60 * 60 * 1000; // 30 days
			}

			// Update Redis with new activity and expiration
			redis
				.set(`session:${sessionId}`, JSON.stringify(updatedSession))
				.catch(() => {});
			redis
				.expire(
					`session:${sessionId}`,
					Math.ceil((updatedSession.expires_at - now) / 1000), // 30 days
				)
				.catch(() => {});

			// Convert back to Session type for compatibility
			const session: Session = {
				id: updatedSession.id,
				user_id: updatedSession.user_id,
				account_id: updatedSession.account_id,
				tenant_id: updatedSession.tenant_id,
				role_id: updatedSession.role_id,
				expires_at: updatedSession.expires_at,
				created_at: updatedSession.created_at,
				last_activity: updatedSession.last_activity,
				ip_address: updatedSession.ip_address,
				user_agent: updatedSession.user_agent,
				revoked_at: updatedSession.revoked_at
					? updatedSession.revoked_at
					: null,
			};

			// Return only IDs - no database queries needed
			return {
				session,
				user: { id: updatedSession.user_id },
				account: { id: updatedSession.account_id },
				tenant: { id: updatedSession.tenant_id },
				role: { id: updatedSession.role_id },
			};
		} catch (error) {
			console.error("Redis session validation error:", error);
			return { session: null, user: null, tenant: null, role: null };
		}
	},

	/**
	 * Creates a new session in Redis
	 * @param token - The session token
	 * @param userId - The ID of the user creating the session
	 * @param tenantId - The ID of the tenant for the session
	 * @param roleId - The ID of the role for the session
	 * @param ipAddress - Optional IP address for the session
	 * @param userAgent - Optional user agent for the session
	 * @returns The created session object
	 */
	create: async ({
		token,
		userId,
		accountId,
		tenantId,
		roleId,
		ipAddress,
		userAgent,
	}: {
		token: string;
		userId: string;
		accountId: string;
		tenantId: string;
		roleId: string;
		ipAddress?: string | null;
		userAgent?: string | null;
	}) => {
		const redis = getRedisClient();
		const sessionId = encodeHexLowerCase(
			sha256(new TextEncoder().encode(token)),
		);

		const now = Date.now();
		const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

		const redisSession: Session = {
			id: sessionId,
			user_id: userId,
			account_id: accountId,
			tenant_id: tenantId,
			role_id: roleId,
			expires_at: expiresAt,
			created_at: now,
			last_activity: now,
			ip_address: ipAddress ?? null,
			user_agent: userAgent ?? null,
			revoked_at: null,
		};

		// Store session in Redis with TTL
		await redis.set(`session:${sessionId}`, JSON.stringify(redisSession));
		await redis.expire(
			`session:${sessionId}`,
			Math.ceil((expiresAt - now) / 1000), // 30 days
		);

		// Add to user's session set for bulk operations
		await redis.sadd(`user_sessions:${userId}`, sessionId);

		// Convert to Session type for compatibility
		const session: Session = {
			id: redisSession.id,
			user_id: redisSession.user_id,
			account_id: redisSession.account_id,
			tenant_id: redisSession.tenant_id,
			role_id: redisSession.role_id,
			expires_at: new Date(redisSession.expires_at).getTime(),
			created_at: new Date(redisSession.created_at).getTime(),
			last_activity: new Date(redisSession.last_activity).getTime(),
			ip_address: redisSession.ip_address,
			user_agent: redisSession.user_agent,
			revoked_at: null,
		};

		return session;
	},

	/**
	 * Invalidates a single session by marking it as revoked
	 * @param sessionId - The ID of the session to invalidate
	 */
	invalidate: async ({ sessionId }: { sessionId: string }) => {
		const redis = getRedisClient();

		// Get session to find user_id for cleanup
		const sessionData = await redis.get(`session:${sessionId}`);
		if (sessionData) {
			const redisSession: Session = JSON.parse(sessionData);

			// Mark as revoked instead of deleting (for audit trail)
			const revokedSession: Session = {
				...redisSession,
				revoked_at: Date.now(),
			};

			// Update with shorter TTL (keep for 24 hours for audit)
			await redis.set(`session:${sessionId}`, JSON.stringify(revokedSession));
			await redis.expire(`session:${sessionId}`, 24 * 60 * 60); // 24 hours

			// Remove from user's active sessions
			await redis.srem(`user_sessions:${redisSession.user_id}`, sessionId);
		}
	},

	/**
	 * Invalidates all sessions for a user by marking them as revoked
	 * @param userId - The ID of the user whose sessions to invalidate
	 */
	invalidateAll: async ({ userId }: { userId: string }) => {
		const redis = getRedisClient();

		// Get all user sessions
		const sessionIds = await redis.smembers(`user_sessions:${userId}`);

		if (sessionIds.length > 0) {
			// Revoke all sessions
			const now = Date.now();

			for (const sessionId of sessionIds) {
				// Get session data
				const sessionData = await redis.get(`session:${sessionId}`);
				if (sessionData) {
					const redisSession: Session = JSON.parse(sessionData);
					const revokedSession: Session = {
						...redisSession,
						revoked_at: now,
					};

					// Mark as revoked with 24h TTL
					await redis.set(
						`session:${sessionId}`,
						JSON.stringify(revokedSession),
					);
					await redis.expire(`session:${sessionId}`, 24 * 60 * 60);
				}
			}

			// Clear user's session set
			await redis.del(`user_sessions:${userId}`);
		}
	},

	/**
	 * Lists all active sessions for a user
	 * @param userId - The ID of the user whose sessions to list
	 * @returns An array of Session objects
	 */
	listUserSessions: async (userId: string) => {
		const redis = getRedisClient();
		const sessionIds = await redis.smembers(`user_sessions:${userId}`);

		const sessions: Session[] = [];
		for (const sessionId of sessionIds) {
			const sessionData = await redis.get(`session:${sessionId}`);
			if (sessionData) {
				const redisSession: Session = JSON.parse(sessionData);

				// Skip revoked sessions
				if (redisSession.revoked_at === null) {
					sessions.push({
						id: redisSession.id,
						user_id: redisSession.user_id,
						account_id: redisSession.account_id,
						tenant_id: redisSession.tenant_id,
						role_id: redisSession.role_id,
						expires_at: new Date(redisSession.expires_at).getTime(),
						created_at: new Date(redisSession.created_at).getTime(),
						last_activity: new Date(redisSession.last_activity).getTime(),
						ip_address: redisSession.ip_address,
						user_agent: redisSession.user_agent,
						revoked_at: null,
					});
				}
			}
		}

		return sessions;
	},

	/**
	 * Gets the latest active session for a user
	 * @param userId - The ID of the user whose latest session to get
	 * @returns The latest Session object or null if no active sessions exist
	 */
	getLatestSession: async (userId: string) => {
		const redis = getRedisClient();
		const sessionIds = await redis.smembers(`user_sessions:${userId}`);

		if (sessionIds.length === 0) {
			return null;
		}

		// Get all session data and find the latest one
		const sessions: Session[] = [];
		for (const sessionId of sessionIds) {
			const sessionData = await redis.get(`session:${sessionId}`);
			if (sessionData) {
				const redisSession: Session = JSON.parse(sessionData);
				// Skip revoked sessions
				if (redisSession.revoked_at === null) {
					sessions.push(redisSession);
				}
			}
		}

		if (sessions.length === 0) {
			return null;
		}

		// Sort by created_at and return the latest
		const latestSession = sessions.sort(
			(a, b) => (b.created_at ?? 0) - (a.created_at ?? 0),
		)[0];

		return latestSession;
	},

	/**
	 * Updates the tenant for a specific session
	 * @param sessionId - The ID of the session to update
	 * @param tenantId - The new tenant ID for the session
	 * @returns The updated Session object
	 */
	updateSessionTenant: async ({
		sessionId,
		tenantId,
	}: {
		sessionId: string;
		tenantId: string;
	}) => {
		const redis = getRedisClient();

		// Get session data
		const sessionData = await redis.get(`session:${sessionId}`);
		if (!sessionData) {
			throw new Error("Session not found");
		}

		const redisSession: Session = JSON.parse(sessionData);

		// Update tenant
		const updatedSession: Session = {
			...redisSession,
			tenant_id: tenantId,
			last_activity: Date.now(),
		};

		// Update Redis with TTL (TODO: ASK ABOUT THIS)
		await redis.set(`session:${sessionId}`, JSON.stringify(updatedSession));
		await redis.expire(
			`session:${sessionId}`,
			Math.ceil((updatedSession.expires_at - Date.now()) / 1000), // Set TTL based on expiration
		);

		// Convert to Session type for compatibility
		const session: Session = {
			id: updatedSession.id,
			user_id: updatedSession.user_id,
			account_id: updatedSession.account_id,
			tenant_id: updatedSession.tenant_id,
			role_id: updatedSession.role_id,
			expires_at: updatedSession.expires_at,
			created_at: updatedSession.created_at,
			last_activity: updatedSession.last_activity,
			ip_address: updatedSession.ip_address,
			user_agent: updatedSession.user_agent,
			revoked_at: updatedSession.revoked_at ? updatedSession.revoked_at : null,
		};

		return session;
	},

	/**
	 * Updates the account for a specific session
	 * @param sessionId - The ID of the session to update
	 * @param accountId - The new account ID for the session
	 * @param tenantId - The new tenant ID for the session
	 * @returns The updated Session object
	 */
	updateSessionAccount: async ({
		sessionId,
		accountId,
		tenantId,
	}: {
		sessionId: string;
		accountId: string;
		tenantId: string;
	}) => {
		const redis = getRedisClient();

		// Get session data
		const sessionData = await redis.get(`session:${sessionId}`);
		if (!sessionData) {
			throw new Error("Session not found");
		}

		const redisSession: Session = JSON.parse(sessionData);

		// Update account
		const updatedSession: Session = {
			...redisSession,
			account_id: accountId,
			tenant_id: tenantId,
			last_activity: Date.now(),
		};

		// Update Redis with TTL (TODO: ASK ABOUT THIS)
		await redis.set(`session:${sessionId}`, JSON.stringify(updatedSession));
		await redis.expire(
			`session:${sessionId}`,
			Math.ceil((updatedSession.expires_at - Date.now()) / 1000), // Set TTL based on expiration
		);

		// Convert to Session type for compatibility
		const session: Session = {
			id: updatedSession.id,
			user_id: updatedSession.user_id,
			account_id: updatedSession.account_id,
			tenant_id: updatedSession.tenant_id,
			role_id: updatedSession.role_id,
			expires_at: updatedSession.expires_at,
			created_at: updatedSession.created_at,
			last_activity: updatedSession.last_activity,
			ip_address: updatedSession.ip_address,
			user_agent: updatedSession.user_agent,
			revoked_at: updatedSession.revoked_at ? updatedSession.revoked_at : null,
		};

		return session;
	},
};
