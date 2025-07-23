import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TenantCreateRequestSchema = z.object({
  name: z.string({ error: "Name is required" }).min(1, {
    message: "Name is required",
  }),
  account_id: z.string({ error: "Account ID is required" }).min(1, {
    message: "Account ID is required",
  }),
  image: z
    .file()
    .max(1024 * 1024 * 25, {
      message: "Image must be less than 25MB",
    })
    .mime(["image/png", "image/webp", "image/jpeg"])
    .optional(),
});

const TENANT_CREATE_ROUTE_PATH = "/api/tenant/create";

const TenantCreateActionDataErrorSchema = ActionDataSchema(
  TenantCreateRequestSchema,
  "error",
  TENANT_CREATE_ROUTE_PATH
);
const TenantCreateActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_CREATE_ROUTE_PATH
);

export type TenantCreateRouteResponse = RouteResponse<
  typeof TenantCreateActionDataSuccessSchema,
  typeof TenantCreateActionDataErrorSchema
>;

export const TENANT_CREATE_ROUTE = {
  path: TENANT_CREATE_ROUTE_PATH,
  method: "POST",
  request: TenantCreateRequestSchema,
  response: z.union([
    TenantCreateActionDataSuccessSchema,
    TenantCreateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantCreateRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_CREATE_ROUTE.path,
    };
  },
} as const;
