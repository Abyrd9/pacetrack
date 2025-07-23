import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TenantUpdateRequestSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Name is required" }).optional(),
  image: z
    .union([
      z
        .file()
        .max(1024 * 1024 * 25, {
          message: "Image must be less than 25MB",
        })
        .mime(["image/png", "image/webp", "image/jpeg"]),
      z.literal("REMOVE"),
    ])
    .optional(),
});

const TENANT_UPDATE_ROUTE_PATH = "/api/tenant/update";

const TenantUpdateActionDataErrorSchema = ActionDataSchema(
  TenantUpdateRequestSchema,
  "error",
  TENANT_UPDATE_ROUTE_PATH
);
const TenantUpdateActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  TENANT_UPDATE_ROUTE_PATH
);

export type TenantUpdateRouteResponse = RouteResponse<
  typeof TenantUpdateActionDataSuccessSchema,
  typeof TenantUpdateActionDataErrorSchema
>;

export const TENANT_UPDATE_ROUTE = {
  path: TENANT_UPDATE_ROUTE_PATH,
  method: "POST",
  request: TenantUpdateRequestSchema,
  response: z.union([
    TenantUpdateActionDataSuccessSchema,
    TenantUpdateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantUpdateRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_UPDATE_ROUTE.path,
    };
  },
} as const;
