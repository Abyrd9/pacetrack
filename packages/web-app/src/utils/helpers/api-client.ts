import RemixedHeaders from "@remix-run/headers";
import { getCSRFToken } from "./csrf-client";

export const client = async <T>(
	passedInEndpoint: string,
	options: RequestInit = {},
	request?: Request,
): Promise<{ data: T; response: Response }> => {
	if (!import.meta.env.VITE_API_BASE_URL)
		throw new Error("API_BASE_URL is not set");

	let endpoint = passedInEndpoint;
	if (endpoint.startsWith("/")) {
		console.warn(
			"Endpoint argument started with a slash, removing it automatically." +
				endpoint,
		);
		endpoint = endpoint.slice(1);
	}

	// if request is provided, use it to get the headers to pass
	// to the API endpoints
	const headers = request?.headers
		? new RemixedHeaders(request.headers)
		: new RemixedHeaders();

	// Remove content-length header as it will be automatically set by fetch
	// based on the actual body being sent
	headers.delete("content-length");

	// If the body is FormData, remove content-type header to let browser set it automatically
	// with the correct boundary
	if (options.body instanceof FormData) {
		headers.delete("content-type");
	}

	// Merge with any options headers
	if (options?.headers) {
		const optionsHeaders = new RemixedHeaders(options.headers);
		optionsHeaders.forEach((value, key) => {
			// Don't override content-type if we're sending FormData
			if (
				options.body instanceof FormData &&
				key.toLowerCase() === "content-type"
			) {
				return;
			}
			headers.set(key, value);
		});
	}

	// Add custom origin tracking header
	const requestOriginUrl =
		request?.url ||
		(typeof window !== "undefined" ? window.location.href : "unknown");
	headers.set("X-Request-Origin-Url", requestOriginUrl);

	// If there's no csrf token from the request, try and get it from the client
	// We don't know if this is being called server-side or client-side.
	const csrf = getCSRFToken(request);
	if (csrf && (options.method !== "GET" || request?.method !== "GET")) {
		headers.set("X-CSRF-Token", csrf);
	}

	const response = await fetch(
		`${import.meta.env.VITE_API_BASE_URL}/${endpoint}`,
		{
			...options,
			credentials: "include",
			// @ts-expect-error - TODO: Upgrade remix package when it's fixed
			headers: headers,
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
		console.error("Error parsing JSON from response: ", endpoint, error);
	}

	return {
		data: json as T,
		response,
	};
};
