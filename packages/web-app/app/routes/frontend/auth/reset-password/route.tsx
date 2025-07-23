import {
  RESET_PASSWORD_ROUTE_PATH,
  RESET_PASSWORD_VALIDATE_ROUTE_PATH,
  type ResetPasswordRouteResponse,
  type ResetPasswordValidateRouteResponse,
} from "@pacetrack/schema";
import { data, redirect, useLoaderData } from "react-router";
import { ResetPasswordForm } from "~/routes/frontend/auth/reset-password/ResetPasswordForm";
import { client } from "~/utils/helpers/api-client";
import type { Route } from "../+types/route";
import type { AuthHandle } from "../route.root";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!code || !email) {
    return data(
      {
        status: "error",
        errors: { global: "Invalid reset password link" },
      } as ResetPasswordValidateRouteResponse,
      { status: 400 }
    );
  }

  const response = await client<ResetPasswordValidateRouteResponse>(
    RESET_PASSWORD_VALIDATE_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }
  );

  return data(response.data);
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.clone().formData();
  const response = await client<ResetPasswordRouteResponse>(
    RESET_PASSWORD_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: form,
    }
  );

  if (response.data.status === "ok") {
    return redirect("/auth/sign-in", { headers: response.response.headers });
  }

  return data(response.data);
}

export const handle = {
  auth: {
    title: "Reset password",
    description: "Reset your password to continue",
  },
} satisfies AuthHandle;

export default function ResetPassword() {
  const data = useLoaderData<typeof loader>();

  return (
    <ResetPasswordForm
      code={data.payload?.code ?? ""}
      email={data.payload?.email ?? ""}
      error={data.errors?.global ?? undefined}
    />
  );
}
