import type { Context } from "hono";
import { deleteCookie, setCookie, setSignedCookie } from "hono/cookie";

export async function setSessionTokenCookie(
	c: Context,
	token: string,
	expires_at: Date | number,
) {
	if (!Bun.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

	// Convert number timestamp to Date object if needed
	const expiresDate =
		typeof expires_at === "number" ? new Date(expires_at) : expires_at;

	return await setSignedCookie(
		c,
		"pacetrack-session",
		token,
		Bun.env.SESSION_SECRET,
		{
			httpOnly: true,
			sameSite: "Lax",
			expires: expiresDate,
			path: "/",
			domain: Bun.env.NODE_ENV !== "production" ? "localhost" : undefined,
			secure: Bun.env.NODE_ENV === "production",
		},
	);
}

export async function setCSRFTokenCookie(
	c: Context,
	csrfToken: string,
	expires_at: Date | number,
) {
	// Convert number timestamp to Date object if needed
	const expiresDate =
		typeof expires_at === "number" ? new Date(expires_at) : expires_at;

	return await setCookie(c, "pacetrack-csrf-token", csrfToken, {
		httpOnly: false, // Allow client-side access for localStorage
		sameSite: "Lax",
		expires: expiresDate,
		path: "/",
		domain: Bun.env.NODE_ENV !== "production" ? "localhost" : undefined,
		secure: Bun.env.NODE_ENV === "production",
	});
}

export async function deleteSessionTokenCookie(c: Context) {
	return await deleteCookie(c, "pacetrack-session");
}

export async function deleteCSRFTokenCookie(c: Context) {
	return await deleteCookie(c, "pacetrack-csrf-token");
}
