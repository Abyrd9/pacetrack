import {
	SIGN_OUT_ROUTE_PATH,
	type SignOutRouteResponse,
} from "@pacetrack/schema";
import { redirect } from "react-router";
import { client } from "~/utils/helpers/api-client";
import { clearCSRFToken } from "~/utils/helpers/csrf-client";
import type { Route } from "./+types/api.sign-out";

export async function action({ request }: Route.ActionArgs) {
	const { response } = await client<SignOutRouteResponse>(
		SIGN_OUT_ROUTE_PATH,
		request,
		{
			method: "POST",
			body: JSON.stringify({}),
		},
	);

	// Clear CSRF token on sign out
	clearCSRFToken();

	const setCookie = response.headers.get("Set-Cookie");
	return redirect("/auth/sign-in", {
		headers: {
			"Set-Cookie": setCookie ?? "",
		},
	});
}
