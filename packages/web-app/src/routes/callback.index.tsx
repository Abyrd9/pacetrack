import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/callback/")({
  server: {
    handlers: {
      GET: async () => {
        throw redirect({
          to: "/auth/sign-in",
        });
      },
    },
  },
});
