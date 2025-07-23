import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TENANT_INVITE_USERS_ROUTE_PATH = "/api/tenant/invite-users";

const TenantInviteUsersRequestSchema = z.object({
  tenantId: z.string(),
  emails: z.array(z.string()),
});

const TenantInviteUsersActionDataErrorSchema = ActionDataSchema(
  TenantInviteUsersRequestSchema,
  "error",
  TENANT_INVITE_USERS_ROUTE_PATH
);

const TenantInviteUsersActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  TENANT_INVITE_USERS_ROUTE_PATH
);

export type TenantInviteUsersRouteResponse = RouteResponse<
  typeof TenantInviteUsersActionDataSuccessSchema,
  typeof TenantInviteUsersActionDataErrorSchema
>;

export const TENANT_INVITE_USERS_ROUTE = {
  path: TENANT_INVITE_USERS_ROUTE_PATH,
  method: "POST",
  request: TenantInviteUsersRequestSchema,
  response: z.union([
    TenantInviteUsersActionDataSuccessSchema,
    TenantInviteUsersActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<TenantInviteUsersRouteResponse, "key">) => {
    return {
      ...args,
      key: TENANT_INVITE_USERS_ROUTE.path,
    };
  },
} as const;
