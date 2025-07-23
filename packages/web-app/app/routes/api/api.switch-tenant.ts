import {
  SESSION_SWITCH_TENANT_ROUTE_PATH,
  VALIDATE_SESSION_ROUTE_PATH,
  type SessionSwitchTenantRouteResponse,
  type ValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { data } from "react-router";
import { client } from "~/utils/helpers/api-client";
import type { Route } from "./+types/api.switch-tenant";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  await client<SessionSwitchTenantRouteResponse>(
    SESSION_SWITCH_TENANT_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: formData,
    }
  );

  const { response } = await client<ValidateSessionRouteResponse>(
    VALIDATE_SESSION_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return data({}, { headers: response.headers });
}
