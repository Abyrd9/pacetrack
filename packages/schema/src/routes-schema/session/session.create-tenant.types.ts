import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SessionCreateTenantRequestSchema = z.object({
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

const SESSION_CREATE_TENANT_ROUTE_PATH = "/api/session/create-tenant";

const SessionCreateTenantActionDataErrorSchema = ActionDataSchema(
  SessionCreateTenantRequestSchema,
  "error",
  SESSION_CREATE_TENANT_ROUTE_PATH
);
const SessionCreateTenantActionDataSuccessSchema = ActionDataSchema(
  TenantSchema,
  "ok",
  SESSION_CREATE_TENANT_ROUTE_PATH
);

export type SessionCreateTenantRouteResponse = RouteResponse<
  typeof SessionCreateTenantActionDataSuccessSchema,
  typeof SessionCreateTenantActionDataErrorSchema
>;

export const SESSION_CREATE_TENANT_ROUTE = {
  path: SESSION_CREATE_TENANT_ROUTE_PATH,
  method: "POST",
  request: SessionCreateTenantRequestSchema,
  response: z.union([
    SessionCreateTenantActionDataSuccessSchema,
    SessionCreateTenantActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionCreateTenantRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_CREATE_TENANT_ROUTE.path,
    };
  },
} as const;
