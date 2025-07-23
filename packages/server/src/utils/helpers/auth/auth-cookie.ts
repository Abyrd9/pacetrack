import type { Context } from "hono";
import { setSignedCookie } from "hono/cookie";
import { getCookieDomain } from "../get-cookie-domain";

export async function setSessionTokenCookie(
  c: Context,
  token: string,
  expires_at: Date | number
) {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

  // Convert number timestamp to Date object if needed
  const expiresDate =
    typeof expires_at === "number" ? new Date(expires_at) : expires_at;

  return await setSignedCookie(
    c,
    "pacetrack-session",
    token,
    process.env.SESSION_SECRET,
    {
      httpOnly: true,
      sameSite: "Lax",
      expires: expiresDate,
      path: "/",
      domain: getCookieDomain(),
      secure: process.env.NODE_ENV === "production",
    }
  );
}
