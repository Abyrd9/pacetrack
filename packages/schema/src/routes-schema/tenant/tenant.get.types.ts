import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TENANT_GET_ROUTE_PATH = "/api/tenant/get";

const TenantGetActionDataErrorSchema = ActionDataSchema(
  z.object({
    global: z.string(),
  }),
  "error",
  TENANT_GET_ROUTE_PATH
);

const TenantGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    tenants: z.array(TenantSchema),
  }),
  "ok",
  TENANT_GET_ROUTE_PATH
);

export type TenantGetRouteResponse = RouteResponse<
  typeof TenantGetActionDataSuccessSchema,
  typeof TenantGetActionDataErrorSchema
>;

export const TENANT_GET_ROUTE = {
  path: TENANT_GET_ROUTE_PATH,
  method: "GET",
  response: z.union([
    TenantGetActionDataSuccessSchema,
    TenantGetActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantGetRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_GET_ROUTE.path,
    };
  },
} as const;
