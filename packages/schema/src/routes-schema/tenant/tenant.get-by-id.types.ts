import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TENANT_GET_BY_ID_ROUTE_PATH = "/api/tenant/get-by-id";

const TenantGetByIdRequestSchema = z.object({
  tenantId: z.string(),
});

const TenantGetByIdActionDataErrorSchema = ActionDataSchema(
  TenantGetByIdRequestSchema,
  "error",
  TENANT_GET_BY_ID_ROUTE_PATH
);
const TenantGetByIdActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_GET_BY_ID_ROUTE_PATH
);

export type TenantGetByIdRouteResponse = RouteResponse<
  typeof TenantGetByIdActionDataSuccessSchema,
  typeof TenantGetByIdActionDataErrorSchema
>;

export const TENANT_GET_BY_ID_ROUTE = {
  path: TENANT_GET_BY_ID_ROUTE_PATH,
  method: "POST",
  request: TenantGetByIdRequestSchema,
  response: z.union([
    TenantGetByIdActionDataSuccessSchema,
    TenantGetByIdActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantGetByIdRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_GET_BY_ID_ROUTE.path,
    };
  },
} as const;
