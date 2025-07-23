import { ROUTE_DEFINITIONS } from "@pacetrack/schema";
import type z from "zod";
import { getCSRFToken } from "./csrf-client";
import { getBaseApiUrl } from "./get-api-base-url";

type RouteDefinitionKey = keyof typeof ROUTE_DEFINITIONS;

type RouteBody<T extends RouteDefinitionKey> =
  (typeof ROUTE_DEFINITIONS)[T] extends { request: infer R }
    ? z.infer<R> | FormData
    : FormData | undefined;

// Custom RequestInit that requires body for routes that need it and doesn't allow method to be overridden
type CustomRequestInit<T extends RouteDefinitionKey> = Omit<
  RequestInit,
  "method" | "body"
> & {
  body?: RouteBody<T>;
};

export const client = async <T extends RouteDefinitionKey>(
  key: T,
  options: CustomRequestInit<T> = {},
  request?: Request
): Promise<{
  data: z.infer<(typeof ROUTE_DEFINITIONS)[T]["response"]>;
  response: Response;
}> => {
  const route = ROUTE_DEFINITIONS[key];
  const { body, ...requestOptions } = options;
  const endpoint = route.path;

  const base = getBaseApiUrl();

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
  if (body instanceof FormData) {
    delete headers["content-type"];
  } else if (body && typeof body === "object") {
    // Set content-type for JSON bodies
    headers["content-type"] = "application/json";
  }

  // Merge with any options headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      // Don't override content-type if we're sending FormData or JSON
      if (
        (body instanceof FormData || (body && typeof body === "object")) &&
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

  const isServerToServer =
    base.includes("http://") && typeof window === "undefined";

  // CSRF token logic - only send when actually needed for security
  const method = route.method; // This is retrieved from the route definition, which is generated
  const isGetRequest = method === "GET";

  // Skip CSRF for GET requests (read-only, safe operations)
  if (!isGetRequest) {
    // Check if this route actually needs CSRF protection
    const needsCsrfProtection = !(
      // Skip for public/auth routes
      (
        endpoint.startsWith("auth/") ||
        // Skip for file serving routes
        endpoint.startsWith("serve/") ||
        // Skip for server-to-server requests (will use Authorization header)
        isServerToServer
      )
    );

    if (needsCsrfProtection) {
      const csrf = getCSRFToken(request);
      if (csrf) {
        headers["X-CSRF-Token"] = csrf;
      }
    }
  }

  // We can't send cookies with http requests, so if it's server->server,
  // we need to set the session cookie value as a header
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
        } as unknown as z.infer<(typeof ROUTE_DEFINITIONS)[T]["response"]>,
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
        } as unknown as z.infer<(typeof ROUTE_DEFINITIONS)[T]["response"]>,
        response: new Response("No dot found in session cookie header", {
          status: 401,
        }),
      };
    }

    const raw = signed.slice(0, lastDotIndex);
    headers["Authorization"] = `Bearer ${raw}`;
  }

  const url = endpoint.startsWith("/")
    ? `${base}${endpoint}`
    : `${base}/${endpoint}`;

  // Prepare the body for the request
  let finalRequestBody: string | FormData | undefined;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    finalRequestBody = JSON.stringify(body);
  } else if (body instanceof FormData) {
    finalRequestBody = body;
  }

  // If the method is GET, we don't need to send a body
  if (route.method === "GET") {
    finalRequestBody = undefined;
  }

  const response = await fetch(url, {
    ...requestOptions,
    method: route.method,
    ...(finalRequestBody && { body: finalRequestBody }),
    credentials: "include",
    headers,
  });

  let json = {
    status: "error" as const,
    errors: { global: "Unknown error" },
  } as unknown as z.infer<(typeof ROUTE_DEFINITIONS)[T]["response"]>;

  try {
    const jsonFromResponse = (await response.json()) as z.infer<
      (typeof ROUTE_DEFINITIONS)[T]["response"]
    >;
    json = jsonFromResponse;
  } catch (error) {
    console.error("Error parsing JSON from response: ", endpoint, error);
  }

  return {
    data: json as z.infer<(typeof ROUTE_DEFINITIONS)[T]["response"]>,
    response,
  };
};
