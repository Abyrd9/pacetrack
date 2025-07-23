import { createFileRoute } from "@tanstack/react-router";
import { getBaseApiUrl } from "~/utils/helpers/get-api-base-url";

export const Route = createFileRoute("/api/healthcheck")({
  server: {
    handlers: {
      GET: async () => {
        const url = getBaseApiUrl();
        if (!url) {
          throw new Error("API_PUBLIC_URL or VITE_API_PUBLIC_URL is not set");
        }

        return new Response(
          JSON.stringify({
            status: "ok",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      },
    },
  },
});
