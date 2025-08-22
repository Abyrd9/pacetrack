import { createServerFileRoute } from "@tanstack/react-start/server";
import { getBaseApiUrl } from "~/utils/helpers/get-api-base-url";

export const ServerRoute = createServerFileRoute("/api/healthcheck").methods({
  GET: async () => {
    const url = getBaseApiUrl();
    if (!url) {
      throw new Error("API_PUBLIC_URL or VITE_API_PUBLIC_URL is not set");
    }

    return {
      status: "ok",
    };
  },
});
