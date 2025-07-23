import { redirect } from "@tanstack/react-router";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/callback/").methods({
	GET: async () => {
		throw redirect({
			to: "/auth/sign-in",
		});
	},
});
