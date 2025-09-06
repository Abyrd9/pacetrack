import {
  ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE,
  type ConfirmEmailChangeRouteResponse,
} from "@pacetrack/schema";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";

const serverFn = createServerFn({
  method: "GET",
}).handler(async (_ctx) => {
  const request = getWebRequest();
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return {
      key: ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path,
      status: "error",
      errors: { global: "Invalid request" },
    } satisfies ConfirmEmailChangeRouteResponse;
  }

  const { data } = await client("ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token }),
  });

  return data;
});

export const Route = createFileRoute("/callback/confirm-email-change")({
  component: RouteComponent,
  loader: async () => {
    return await serverFn();
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <main className="container mx-auto max-w-md py-12 space-y-6 h-full flex items-center justify-center">
      {data.status === "ok" ? (
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
          {data.errors?.form && (
            <p className="text-muted-foreground text-sm">
              {data.errors?.form
                ? data.errors.form
                : data.errors?.global
                  ? data.errors.global
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
