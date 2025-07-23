import {
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
  type ConfirmEmailChangeRouteResponse,
} from "@pacetrack/schema";
import { ArrowUpRightIcon } from "lucide-react";
import { Link, data, useLoaderData } from "react-router";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return data<ConfirmEmailChangeRouteResponse>({
      key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
      status: "error",
      errors: { global: "Invalid link" },
    });
  }

  const response = await client<ConfirmEmailChangeRouteResponse>(
    CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
    request,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    }
  );
  return data(response.data);
}

export default function ConfirmEmailChange() {
  const result = useLoaderData<typeof loader>();

  return (
    <main className="container mx-auto max-w-md py-12 space-y-6 h-full flex items-center justify-center">
      {result.status === "ok" ? (
        <div className="space-y-2 text-center flex flex-col items-center">
          <h1 className="text-2xl font-bold">Email Confirmed</h1>
          <p className="text-muted-foreground text-sm">
            Your email has been updated successfully.
          </p>
          <Button
            className="max-w-40 flex items-center gap-2 justify-between"
            size="sm"
            asChild
          >
            <Link to="/settings">
              <span className="max-w-40">Go to Settings</span>
              <ArrowUpRightIcon />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-center flex flex-col items-center">
          <h1 className="text-2xl font-bold text-destructive flex items-center gap-2">
            A problem occurred
          </h1>
          {result.errors?.form && (
            <p className="text-muted-foreground text-sm">
              {result.errors?.form
                ? result.errors.form
                : result.errors?.global
                ? result.errors.global
                : "Something went wrong"}
            </p>
          )}
          <Button
            className="max-w-40 flex items-center gap-2 justify-between"
            size="sm"
            asChild
          >
            <Link to="/settings">
              <span className="max-w-40">Back to Settings</span>
              <ArrowUpRightIcon />
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}
