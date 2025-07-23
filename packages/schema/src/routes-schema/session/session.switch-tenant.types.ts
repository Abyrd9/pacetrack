import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_SWITCH_TENANT_ROUTE_PATH = "/api/session/switch-tenant";

const SessionSwitchTenantRequestSchema = z.object({
  tenant_id: z.string({ error: "Tenant ID is required" }).min(1, {
    message: "Tenant ID is required",
  }),
});

const SessionSwitchTenantActionDataErrorSchema = ActionDataSchema(
  SessionSwitchTenantRequestSchema,
  "error",
  SESSION_SWITCH_TENANT_ROUTE_PATH
);

const SessionSwitchTenantActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_SWITCH_TENANT_ROUTE_PATH
);

export type SessionSwitchTenantRouteResponse = RouteResponse<
  typeof SessionSwitchTenantActionDataSuccessSchema,
  typeof SessionSwitchTenantActionDataErrorSchema
>;

export const SESSION_SWITCH_TENANT_ROUTE = {
  path: SESSION_SWITCH_TENANT_ROUTE_PATH,
  method: "POST",
  request: SessionSwitchTenantRequestSchema,
  response: z.discriminatedUnion("status", [
    SessionSwitchTenantActionDataSuccessSchema,
    SessionSwitchTenantActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionSwitchTenantRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_SWITCH_TENANT_ROUTE.path,
    };
  },
} as const;
