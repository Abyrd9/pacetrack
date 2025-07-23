/**
 * Frontend CSRF token management
 *
 * This module handles CSRF token storage and retrieval for the frontend.
 * CSRF tokens are received from sign-in/sign-up responses and stored in localStorage.
 * For server-side usage (React Router actions), tokens are read from cookies.
 */

const CSRF_TOKEN_KEY = "pacetrack-csrf-token";

/**
 * Checks if we're running in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Stores a CSRF token in localStorage (client-side only)
 * This should be called after successful login/signup
 *
 * @param csrfToken - The CSRF token to store
 */
export function storeCSRFToken(csrfToken: string): void {
	if (isBrowser()) {
		localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
	}
}

/**
 * Retrieves the stored CSRF token from localStorage (client-side) or cookies (server-side)
 *
 * @param request - Optional Request object for server-side cookie access
 * @returns The CSRF token or null if not found
 */
export function getCSRFToken(request?: Request): string | null {
	// Server-side: try to get from cookies
	if (request) {
		const cookies = request.headers.get("cookie");
		if (cookies) {
			const csrfMatch = cookies.match(/pacetrack-csrf-token=([^;]+)/);
			if (csrfMatch) {
				return decodeURIComponent(csrfMatch[1]);
			}
		}
	}

	// Client-side: prioritize cookies over localStorage
	if (isBrowser()) {
		// First try to get from cookies (for server-side actions)
		const cookies = document.cookie;
		const csrfMatch = cookies.match(/pacetrack-csrf-token=([^;]+)/);
		if (csrfMatch) {
			return decodeURIComponent(csrfMatch[1]);
		}

		// Fall back to localStorage
		return localStorage.getItem(CSRF_TOKEN_KEY);
	}

	return null;
}

/**
 * Removes the CSRF token from localStorage (client-side only)
 * This should be called on logout
 */
export function clearCSRFToken(): void {
	if (isBrowser()) {
		localStorage.removeItem(CSRF_TOKEN_KEY);
	}
}

/**
 * Checks if a CSRF token exists in localStorage (client-side) or cookies (server-side)
 *
 * @param request - Optional Request object for server-side cookie access
 * @returns True if a CSRF token is stored
 */
export function hasCSRFToken(request?: Request): boolean {
	return getCSRFToken(request) !== null;
}
