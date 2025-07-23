import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TENANT_GET_ROUTE_PATH = "/api/tenant/get";

export const TenantGetActionDataErrorSchema = ActionDataSchema(
  z.object({
    yo: z.string(),
  }),
  "error",
  TENANT_GET_ROUTE_PATH
);

export const TenantGetActionDataSuccessSchema = ActionDataSchema(
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

export const makeTenantGetRouteResponse = (args: TenantGetRouteResponse) =>
  args;
