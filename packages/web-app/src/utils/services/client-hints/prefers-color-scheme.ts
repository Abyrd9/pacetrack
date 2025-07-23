/**
 * Gets the prefers color scheme cookie.
 */
/** biome-ignore-all lint/suspicious/noDocumentCookie: We use a cookie to track the prefers color scheme */
export function hint_getPrefersColorScheme(request?: Request) {
	const cookieString =
		typeof document !== "undefined"
			? document.cookie
			: typeof request !== "undefined"
				? (request.headers.get("Cookie") ?? "")
				: "";

	const value = cookieString
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith("pacetrack-CH-prefers-color-scheme="))
		?.split("=")[1];

	return value ? decodeURIComponent(value) : null;
}

/**
 * Checks the prefers color scheme cookie. If it has changed, reloads the page.
 */
export function hint_checkPrefersColorScheme() {
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
		.find((c) => c.startsWith("pacetrack-CH-prefers-color-scheme="))
		?.split("=")[1];

	const prefersColorSchemeCookie = value ? decodeURIComponent(value) : null;
	const prefersColorScheme = window.matchMedia("(prefers-color-scheme: dark)")
		.matches
		? "dark"
		: "light";

	if (!prefersColorSchemeCookie) {
		document.cookie = `pacetrack-CH-prefers-color-scheme=${prefersColorScheme}; Max-Age=31536000; path=/`;
		window.location.reload();
	}
}
