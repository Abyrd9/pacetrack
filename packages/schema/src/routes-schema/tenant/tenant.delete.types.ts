import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TENANT_DELETE_ROUTE_PATH = "/api/tenant/delete";

const TenantDeleteRequestSchema = z.object({
  tenantId: z.string(),
});

const TenantDeleteActionDataErrorSchema = ActionDataSchema(
  TenantDeleteRequestSchema,
  "error",
  TENANT_DELETE_ROUTE_PATH
);

const TenantDeleteActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  TENANT_DELETE_ROUTE_PATH
);

export type TenantDeleteRouteResponse = RouteResponse<
  typeof TenantDeleteActionDataSuccessSchema,
  typeof TenantDeleteActionDataErrorSchema
>;

export const TENANT_DELETE_ROUTE = {
  path: TENANT_DELETE_ROUTE_PATH,
  method: "POST",
  request: TenantDeleteRequestSchema,
  response: z.union([
    TenantDeleteActionDataSuccessSchema,
    TenantDeleteActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantDeleteRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_DELETE_ROUTE.path,
    };
  },
} as const;
