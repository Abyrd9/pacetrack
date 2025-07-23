import {
  SIGN_IN_ROUTE_PATH,
  type SignInRouteResponse,
} from "@pacetrack/schema";
import { data, redirect } from "react-router";
import { GoogleSignInForm } from "~/routes/frontend/auth/SignInFormGoogle";
import { client } from "~/utils/helpers/api-client";
import { storeCSRFToken } from "~/utils/helpers/csrf-client";
import type { AuthHandle } from "../route.root";
import type { Route } from "./+types/route";
import { SignInForm } from "./SignInForm";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();

  const { response, data: json } = await client<SignInRouteResponse>(
    SIGN_IN_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: form,
    }
  );

  console.log(json);

  if (json.status === "ok") {
    // Store CSRF token for subsequent requests
    if (json.payload?.csrfToken) {
      storeCSRFToken(json.payload.csrfToken);
    }
    return redirect("/", { headers: response.headers });
  }
  return data(json);
}

export const handle = {
  auth: {
    title: "Sign in",
    description: "Sign in to your account to continue",
  },
} satisfies AuthHandle;

export default function SignIn() {
  return (
    <>
      <GoogleSignInForm />

      <div className="flex items-center space-x-3 py-6">
        <div className="h-[1px] w-full bg-gray-100" />
        <span className="-translate-y-[2px] text-sm text-muted-foreground">
          or
        </span>
        <div className="h-[1px] w-full bg-gray-100" />
      </div>

      <SignInForm />
    </>
  );
}
