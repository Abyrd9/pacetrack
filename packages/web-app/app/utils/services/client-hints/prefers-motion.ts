/**
 * Gets the prefers motion cookie.
 */
export function hint_getPrefersMotion(request?: Request) {
  const cookieString =
    typeof document !== "undefined"
      ? document.cookie
      : typeof request !== "undefined"
      ? request.headers.get("Cookie") ?? ""
      : "";

  const value = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("pacetrack-CH-prefers-motion"))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

/**
 * Checks the prefers motion cookie. If it has changed, reloads the page.
 */
export function hint_checkPrefersMotion() {
  if (!navigator.cookieEnabled) return false;

  // set a short-lived cookie to make sure we can set cookies
  document.cookie = "canSetCookies=1; Max-Age=60; SameSite=Lax";
  const canSetCookies = document.cookie.includes("canSetCookies=1");
  document.cookie = "canSetCookies=; Max-Age=-1; path=/";

  if (!canSetCookies) return;

  const cookieString = typeof document !== "undefined" ? document.cookie : "";

  const value = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("pacetrack-CH-prefers-motion="))
    ?.split("=")[1];

  const prefersMotionCookie = value ? decodeURIComponent(value) : null;
  const prefersMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches
    ? "reduce"
    : "no-preference";

  if (!prefersMotionCookie) {
    document.cookie = `pacetrack-CH-prefers-motion=${prefersMotion}; Max-Age=31536000; path=/`;
    window.location.reload();
  }
}
