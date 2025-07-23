import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TENANT_INVITE_USERS_ROUTE_PATH = "/api/tenant/invite-users";

export const TenantInviteUsersRequestSchema = z.object({
  tenantId: z.string(),
  emails: z.array(z.string()),
});

export const TenantInviteUsersActionDataErrorSchema = ActionDataSchema(
  TenantInviteUsersRequestSchema,
  "error",
  TENANT_INVITE_USERS_ROUTE_PATH
);

export const TenantInviteUsersActionDataSuccessSchema = ActionDataSchema(
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

export const makeTenantInviteUsersRouteResponse = (
  args: TenantInviteUsersRouteResponse
) => args;
