import type { User } from "@pacetrack/schema";
import { sessions } from "src/utils/helpers/auth-session";
import { setTestSession } from "src/utils/test-helpers/set-test-session";

export interface TwoSessions {
	user: User;
	cookie: string;
	currentSessionId: string;
	otherSessionId: string;
	csrfToken: string;
}

/**
 * Creates two active sessions for the same user – one designated as the
 * "current" session (the first cookie returned) and another "other" session.
 *
 * Useful for tests that need to exercise session‐management routes such as
 * list, revoke, and revoke-all.
 */
export async function createTwoSessions(): Promise<TwoSessions> {
	const { user, account, cookie, csrfToken } = await setTestSession();

	// First (current) session
	const userSessions = await sessions.listUserSessions(user.id);
	const firstSession = userSessions.sort(
		(a, b) => (b.created_at ?? 0) - (a.created_at ?? 0),
	)[0];
	const currentSessionId = firstSession.id;

	// Second session for the same user - create session without new account
	const token2 = sessions.generateToken();
	await sessions.create({
		token: token2,
		userId: user.id,
		accountId: account.id,
		tenantId: userSessions[0].tenant_id,
		roleId: userSessions[0].role_id,
		ipAddress: "127.0.0.1",
		userAgent: "test-agent",
	});

	const updatedUserSessions = await sessions.listUserSessions(user.id);
	const sortedSessions = updatedUserSessions.sort(
		(a, b) => (b.created_at ?? 0) - (a.created_at ?? 0),
	);
	const otherSessionId =
		sortedSessions[0].id === currentSessionId
			? sortedSessions[1].id
			: sortedSessions[0].id;

	return { user, cookie, currentSessionId, otherSessionId, csrfToken };
}
