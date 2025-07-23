import {
  FORGOT_PASSWORD_ROUTE_PATH,
  type ForgotPasswordRouteResponse,
} from "@pacetrack/schema";
import { ArrowLeft, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, data, useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";
import type { Route } from "../+types/route";
import type { AuthHandle } from "../route.root";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.clone().formData();

  const response = await client<ForgotPasswordRouteResponse>(
    FORGOT_PASSWORD_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: form,
    }
  );

  return data(response.data);
}

export const handle = {
  auth: {
    title: "Forgot password",
    description: "Forgot your password? No problem",
  },
} satisfies AuthHandle;

export default function ForgotPassword() {
  const fetcher = useFetcher<ForgotPasswordRouteResponse>();
  const data = fetcher.data;

  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (data?.status === "ok") setSubmitted(true);
  }, [data]);

  return (
    <>
      {submitted ? (
        <div>
          <div className=" flex items-center space-x-2">
            <span className="text-xl font-bold ">Email Sent</span>
            <Mail className="text-base" />
          </div>
          <div className="text-sm/snug text-muted-foreground pt-2">
            If you have an account, you&apos;ll receive an email with a link to
            reset your password.
          </div>

          <div className="pt-6">
            <Button className="w-fit space-x-2" asChild>
              <Link to="/auth/sign-in">
                <ArrowLeft />
                <span>Back to Sign In</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ForgotPasswordForm />
      )}
    </>
  );
}
