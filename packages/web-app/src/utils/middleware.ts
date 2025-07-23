import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getCSRFToken } from "./helpers/csrf-client";

const csrfMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const request = getRequest();

    const headers: Record<string, string> = {};
    if (request.method !== "GET") {
      const csrf = await getCSRFToken();
      headers["x-csrf-token"] = csrf ?? "";
    }

    const response = await next({ headers });

    return response;
  }
);

export { csrfMiddleware };
