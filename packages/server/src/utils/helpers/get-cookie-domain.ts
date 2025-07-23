export function getCookieDomain() {
	// In development, don't set domain (defaults to exact host)
	if (process.env.NODE_ENV !== "production") return undefined;

	// In production, if no DOMAIN env var is set, use undefined (exact host)
	if (!process.env.RAILWAY_PUBLIC_DOMAIN) return undefined;

	// RAILWAY_PUBLIC_DOMAIN will be a subdomain for the API usually like "api.pacetrack.com"
	// We need to return the domain without the subdomain
	return `.${process.env.RAILWAY_PUBLIC_DOMAIN.split(".").slice(1).join(".")}`;
}
