/**
 * Frontend CSRF token management
 *
 * This module handles CSRF token storage and retrieval for the frontend.
 * CSRF tokens are received from sign-in/sign-up responses and stored in localStorage and cookies.
 * For server-side usage (React Router actions), tokens are read from cookies.
 */

import { isBrowser } from "./is-browser";

const CSRF_TOKEN_KEY = "pacetrack-csrf-token";

/**
 * Stores a CSRF token in localStorage and as a document cookie (client-side only)
 * This should be called after successful login/signup
 *
 * @param csrfToken - The CSRF token to store
 */
export function setCSRFToken(csrfToken: string): void {
  if (isBrowser()) {
    // Store in localStorage for client-side access
    localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);

    // Also set as a document cookie for server-side actions
    // Set with same path and domain as the session cookie

    // biome-ignore lint/suspicious/noDocumentCookie: This is fine.
    document.cookie = `pacetrack-csrf-token=${encodeURIComponent(
      csrfToken
    )}; path=/; SameSite=Strict`;
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
        if (!csrfMatch[1]) return null;
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
      if (!csrfMatch[1]) return null;
      return decodeURIComponent(csrfMatch[1]);
    }

    // Fall back to localStorage
    return localStorage.getItem(CSRF_TOKEN_KEY);
  }

  return null;
}

/**
 * Removes the CSRF token from localStorage and cookies (client-side only)
 * This should be called on logout
 */
export function clearCSRFToken(): void {
  if (isBrowser()) {
    // Remove from localStorage
    localStorage.removeItem(CSRF_TOKEN_KEY);

    // Remove the cookie by setting it with an expired date
    // biome-ignore lint/suspicious/noDocumentCookie: This is fine.
    document.cookie = `pacetrack-csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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
