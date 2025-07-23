import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TENANT_GET_BY_ID_ROUTE_PATH = "/api/tenant/get-by-id";

export const TenantGetByIdRequestSchema = z.object({
  tenantId: z.string(),
});

export const TenantGetByIdActionDataErrorSchema = ActionDataSchema(
  TenantGetByIdRequestSchema,
  "error",
  TENANT_GET_BY_ID_ROUTE_PATH
);
export const TenantGetByIdActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_GET_BY_ID_ROUTE_PATH
);

export type TenantGetByIdRouteResponse = RouteResponse<
  typeof TenantGetByIdActionDataSuccessSchema,
  typeof TenantGetByIdActionDataErrorSchema
>;

export const makeTenantGetByIdRouteResponse = (
  args: TenantGetByIdRouteResponse
) => args;
