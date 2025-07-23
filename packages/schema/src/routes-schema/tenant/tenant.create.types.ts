import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TenantCreateRequestSchema = TenantSchema.pick({
  name: true,
  image_url: true,
  account_id: true,
}).extend({
  name: z.string({ error: "Name is required" }).min(1, {
    message: "Name is required",
  }),
  image_url: z.string().url().optional(),
  account_id: z.string().optional(), // Optional - if not provided, a new account will be created
});

export const TENANT_CREATE_ROUTE_PATH = "/api/tenant/create";

export const TenantCreateActionDataErrorSchema = ActionDataSchema(
  TenantCreateRequestSchema,
  "error",
  TENANT_CREATE_ROUTE_PATH
);
export const TenantCreateActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_CREATE_ROUTE_PATH
);

export type TenantCreateRouteResponse = RouteResponse<
  typeof TenantCreateActionDataSuccessSchema,
  typeof TenantCreateActionDataErrorSchema
>;

export const makeTenantCreateRouteResponse = (
  args: TenantCreateRouteResponse
) => args;
