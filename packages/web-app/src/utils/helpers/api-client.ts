import RemixedHeaders from "@remix-run/headers";
import { getCSRFToken } from "./csrf-client";
import { getBaseApiUrl } from "./get-api-base-url";

export const client = async <T>(
  passedInEndpoint: string,
  options: RequestInit = {},
  request?: Request
): Promise<{ data: T; response: Response }> => {
  const base = getBaseApiUrl();

  let endpoint = passedInEndpoint;
  if (endpoint.startsWith("/")) {
    console.warn(
      "Endpoint argument started with a slash, removing it automatically." +
        endpoint
    );
    endpoint = endpoint.slice(1);
  }

  const headers: Record<string, string> = {};

  // if request is provided, add the headers
  if (request) {
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Remove content-length header as it will be automatically set by fetch
  // based on the actual body being sent
  delete headers["content-length"];

  // If the body is FormData, remove content-type header to let browser set it automatically
  // with the correct boundary
  if (options.body instanceof FormData) {
    delete headers["content-type"];
  }

  // Merge with any options headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      // Don't override content-type if we're sending FormData
      if (
        options.body instanceof FormData &&
        key.toLowerCase() === "content-type"
      ) {
        return;
      }
      headers[key] = value;
    });
  }

  // Add custom origin tracking header
  const requestOriginUrl =
    request?.url ||
    (typeof window !== "undefined" ? window.location.href : "unknown");
  headers["X-Request-Origin-Url"] = requestOriginUrl;

  // If there's no csrf token from the request, try and get it from the client
  // We don't know if this is being called server-side or client-side.
  const csrf = getCSRFToken(request);
  if (csrf && (options.method !== "GET" || request?.method !== "GET")) {
    headers["X-CSRF-Token"] = csrf;
  }

  const isServerToServer =
    base.includes("http://") && typeof window === "undefined";

  // If it's server to server, we need to set the session cookie value as a header
  // We can't send cookies with http requests, so we need to set the session cookie value as a header
  // This only happens on server -> server requests though so we livin.
  if (isServerToServer) {
    const cookies = headers?.cookie;
    const sessionCookieHeader = cookies
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("pacetrack-session="));

    if (!sessionCookieHeader) {
      console.error("No session cookie header found");
      return {
        data: {
          status: "error",
          errors: { global: "No session cookie header found" },
        } as T,
        response: new Response("No session cookie header found", {
          status: 401,
        }),
      };
    }

    const signed = decodeURIComponent(sessionCookieHeader.split("=")[1] || "");
    const lastDotIndex = signed.lastIndexOf(".");

    if (lastDotIndex === -1) {
      console.error("No dot found in session cookie header");
      return {
        data: {
          status: "error",
          errors: { global: "No dot found in session cookie header" },
        } as T,
        response: new Response("No dot found in session cookie header", {
          status: 401,
        }),
      };
    }

    const raw = signed.slice(0, lastDotIndex);
    headers["Authorization"] = `Bearer ${raw}`;
  }

  const response = await fetch(`${base}/${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

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
