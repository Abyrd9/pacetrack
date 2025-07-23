/**
 * Server-side CSRF token management for React Router actions
 * This module handles CSRF token retrieval from cookies in server-side contexts.
 */

/**
 * Retrieves the CSRF token from cookies in a server-side context
 *
 * @param request - The Request object containing cookies
 * @returns The CSRF token or null if not found
 */
export function getServerCSRFToken(request: Request): string | null {
	const cookies = request.headers.get("cookie");
	if (!cookies) return null;

	const csrfMatch = cookies.match(/pacetrack-csrf-token=([^;]+)/);
	if (!csrfMatch) return null;

	return decodeURIComponent(csrfMatch[1]);
}

/**
 * Checks if a CSRF token exists in cookies
 *
 * @param request - The Request object containing cookies
 * @returns True if a CSRF token is found
 */
export function hasServerCSRFToken(request: Request): boolean {
	return getServerCSRFToken(request) !== null;
}
