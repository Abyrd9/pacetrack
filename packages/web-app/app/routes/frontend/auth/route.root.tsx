import {
  VALIDATE_SESSION_ROUTE_PATH,
  type ValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { Outlet, data } from "react-router";
import { Card } from "~/components/primitives/card";
import { client } from "~/utils/helpers/api-client";
import { cx } from "~/utils/helpers/cx";
import type { Route } from "./+types/route";

const PRIVATE_AUTH_ROUTES = ["/auth/confirm-email-change"];

export async function loader({ request }: Route.LoaderArgs) {
  const { data: json } = await client<ValidateSessionRouteResponse>(
    VALIDATE_SESSION_ROUTE_PATH,
    request
  );

  // if (json.status === "ok" && !PRIVATE_AUTH_ROUTES.includes(request.url)) {
  //   return redirect("/");
  // }

  return data(json);
}

export type AuthHandle =
  | {
      auth: {
        title: string;
        description: string;
      };
    }
  | undefined;

export default function AuthRoot({ matches }: Route.ComponentProps) {
  const match = matches.find((match) => {
    return !!(match?.handle as AuthHandle)?.auth;
  });

  const title = (match?.handle as AuthHandle)?.auth?.title;
  const description = (match?.handle as AuthHandle)?.auth?.description;

  return (
    <div className="flex h-dvh w-full items-center justify-center px-4">
      <Card className="w-full max-w-md px-14 py-8 shadow-md">
        {/* Replace with logo */}
        {/* <img src={Logo} width={140} alt="indevor.io logo" /> */}

        <div className={cx(title || description ? "py-8" : "")}>
          {title && (
            <h1 className="text-3xl font-bold text-foreground pb-2">{title}</h1>
          )}
          {description && (
            <p className="text-sm/snug text-muted-foreground">{description}</p>
          )}
        </div>

        <Outlet />
      </Card>
    </div>
  );
}
