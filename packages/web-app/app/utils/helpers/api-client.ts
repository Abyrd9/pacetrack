import { getCSRFToken } from "./csrf-client";

export const client = async <T>(
	passedInEndpoint: string,
	request: Request,
	options: RequestInit = {},
): Promise<{ data: T; response: Response }> => {
	if (!import.meta.env.VITE_API_BASE_URL)
		throw new Error("API_BASE_URL is not set");

	let endpoint = passedInEndpoint;
	if (endpoint.startsWith("/")) {
		console.warn(
			"Endpoint argument started with a slash, removing it automatically.",
		);
		endpoint = endpoint.slice(1);
	}

	// Get CSRF token for state-changing requests (pass request for server-side access)
	const csrfToken = getCSRFToken(request);
	const headers: Record<string, string> = {
		cookie: request.headers.get("cookie") ?? "",
	};

	// Add existing headers from options
	if (options.headers) {
		if (
			typeof options.headers === "object" &&
			!Array.isArray(options.headers)
		) {
			Object.assign(headers, options.headers);
		}
	}

	// Add CSRF token to headers for non-GET requests (state-changing operations)
	if (csrfToken && options.method && options.method !== "GET") {
		headers["x-csrf-token"] = csrfToken;
	}

	const response = await fetch(
		`${import.meta.env.VITE_API_BASE_URL}/${endpoint}`,
		{
			...options,
			credentials: "include",
			headers,
		},
	);

	let json = {
		status: "error" as const,
		errors: { global: "Unknown error" },
	} as T;
	try {
		const jsonFromResponse = (await response.json()) as T;
		json = jsonFromResponse;
	} catch (error) {
		console.error("Error parsing JSON from response: ", endpoint);
	}

	return {
		data: json as T,
		response,
	};
};
