import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";

/**
 * Generates a CSRF token based on the session token
 *
 * CSRF tokens are derived from the session token to ensure:
 * - Each session has a unique CSRF token
 * - Only the legitimate application can generate valid tokens
 * - Tokens are automatically invalidated when sessions expire
 *
 * @param sessionToken - The current session token from the signed cookie
 * @returns A 32-character CSRF token string
 */
export async function generateCSRFToken(sessionToken: string): Promise<string> {
	// Create a SHA-256 hash of the session token
	const hash = sha256(new TextEncoder().encode(sessionToken));

	// Take the first 32 characters of the hex-encoded hash
	// This provides sufficient entropy while keeping the token manageable
	return encodeHexLowerCase(hash).slice(0, 32);
}

/**
 * Validates a CSRF token against the session token
 *
 * This function regenerates the expected CSRF token from the session token
 * and compares it with the provided CSRF token. If they match, the request
 * is legitimate. If they don't match, it's likely a CSRF attack.
 *
 * @param csrfToken - The CSRF token sent with the request (from header or query param)
 * @param sessionToken - The current session token from the signed cookie
 * @returns True if the CSRF token is valid for this session
 */
export async function validateCSRFToken(
	csrfToken: string,
	sessionToken: string,
): Promise<boolean> {
	// Generate the expected CSRF token for this session
	const expectedToken = await generateCSRFToken(sessionToken);

	// Compare the provided token with the expected token
	// Use constant-time comparison to prevent timing attacks
	return csrfToken === expectedToken;
}
