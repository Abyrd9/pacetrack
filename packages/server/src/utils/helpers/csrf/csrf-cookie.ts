import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { getCookieDomain } from "../get-cookie-domain";

export async function setCSRFTokenCookie(
  c: Context,
  csrfToken: string,
  expires_at: Date | number
) {
  // Convert number timestamp to Date object if needed
  const expiresDate =
    typeof expires_at === "number" ? new Date(expires_at) : expires_at;

  return await setCookie(c, "pacetrack-csrf-token", csrfToken, {
    httpOnly: false, // Allow client-side access for localStorage
    sameSite: "Lax",
    expires: expiresDate,
    path: "/",
    domain: getCookieDomain(),
    secure: process.env.NODE_ENV === "production",
  });
}

export async function deleteSessionTokenCookie(c: Context) {
  return await deleteCookie(c, "pacetrack-session");
}

export async function deleteCSRFTokenCookie(c: Context) {
  return await deleteCookie(c, "pacetrack-csrf-token");
}
