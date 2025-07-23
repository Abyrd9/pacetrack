export function getBaseApiUrl() {
	if (typeof window !== "undefined") {
		// We're in the browser
		if (!import.meta.env.VITE_API_DOMAIN) {
			throw new Error("VITE_API_DOMAIN is not set");
		}

		if (import.meta.env.PROD) {
			return `https://${import.meta.env.VITE_API_DOMAIN}`;
		} else if (import.meta.env.DEV) {
			return "http://localhost:4000";
		} else {
			throw new Error("Unknown environment");
		}
	} else {
		// We're in the server
		if (!process.env.API_DOMAIN) throw new Error("API_DOMAIN is not set");

		if (import.meta.env.PROD) {
			return `http://${process.env.API_DOMAIN}:${process.env.API_PORT}`;
		} else if (import.meta.env.DEV) {
			return "http://localhost:4000";
		} else {
			throw new Error("Unknown environment");
		}
	}
}
