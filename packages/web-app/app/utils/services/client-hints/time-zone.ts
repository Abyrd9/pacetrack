/**
 * Gets the time zone cookie.
 */
export function hint_getTimeZone(request?: Request) {
  const cookieString = request?.headers.get("Cookie") ?? "";
  const value = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("pacetrack-CH-time-zone"))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

/**
 * Checks the time zone cookie. If it has changed, reloads the page.
 */
export function hint_checkTimeZone(request?: Request) {
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
    .find((c) => c.startsWith("pacetrack-CH-time-zone="))
    ?.split("=")[1];

  const timeZoneCookie = value ? decodeURIComponent(value) : null;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneCookie || timeZoneCookie !== timeZone) {
    document.cookie = `pacetrack-CH-time-zone=${timeZone}; Max-Age=31536000; path=/`;
    window.location.reload();
  }
}
