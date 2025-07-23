import { z } from "zod/v4";

import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { TenantSchema } from "../../db-schema/tenant";

export const UserAcceptInviteRequestSchema = z.object({
  code: z.string(),
  email: z.string(),
  tenantId: z.string(),
});

export const USER_ACCEPT_INVITE_ROUTE_PATH = "/api/user/accept-invite";

export const UserAcceptInviteActionDataErrorSchema = ActionDataSchema(
  UserAcceptInviteRequestSchema,
  "error",
  USER_ACCEPT_INVITE_ROUTE_PATH
);

export const UserAcceptInviteActionDataSuccessSchema = ActionDataSchema(
  z.object({
    tenant: TenantSchema,
  }),
  "ok",
  USER_ACCEPT_INVITE_ROUTE_PATH
);

export type UserAcceptInviteRouteResponse = RouteResponse<
  typeof UserAcceptInviteActionDataSuccessSchema,
  typeof UserAcceptInviteActionDataErrorSchema
>;

export const makeUserAcceptInviteRouteResponse = (
  args: UserAcceptInviteRouteResponse
) => args;
