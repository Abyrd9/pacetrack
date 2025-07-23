import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TenantUpdateRequestSchema = TenantSchema.pick({
  id: true,
  name: true,
  image_url: true,
}).extend({
  id: z.string(),
  name: z.string({ error: "Name is required" }).min(1, {
    message: "Name is required",
  }),
  image_url: z.string().url().optional(),
});

export const TENANT_UPDATE_ROUTE_PATH = "/api/tenant/update";

export const TenantUpdateActionDataErrorSchema = ActionDataSchema(
  TenantUpdateRequestSchema,
  "error",
  TENANT_UPDATE_ROUTE_PATH
);
export const TenantUpdateActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_UPDATE_ROUTE_PATH
);

export type TenantUpdateRouteResponse = RouteResponse<
  typeof TenantUpdateActionDataSuccessSchema,
  typeof TenantUpdateActionDataErrorSchema
>;

export const makeTenantUpdateRouteResponse = (
  args: TenantUpdateRouteResponse
) => args;
