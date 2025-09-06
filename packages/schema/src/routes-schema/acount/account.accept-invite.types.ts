import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountAcceptInviteRequestSchema = z.object({
  code: z.string(),
  email: z.string(),
  tenantId: z.string(),
});

const ACCOUNT_ACCEPT_INVITE_ROUTE_PATH = "/api/account/accept-invite";

const AccountAcceptInviteActionDataErrorSchema = ActionDataSchema(
  AccountAcceptInviteRequestSchema,
  "error",
  ACCOUNT_ACCEPT_INVITE_ROUTE_PATH
);

const AccountAcceptInviteActionDataSuccessSchema = ActionDataSchema(
  z.object({
    tenant: TenantSchema,
  }),
  "ok",
  ACCOUNT_ACCEPT_INVITE_ROUTE_PATH
);

export type AccountAcceptInviteRouteResponse = RouteResponse<
  typeof AccountAcceptInviteActionDataSuccessSchema,
  typeof AccountAcceptInviteActionDataErrorSchema
>;

export const ACCOUNT_ACCEPT_INVITE_ROUTE = {
  path: ACCOUNT_ACCEPT_INVITE_ROUTE_PATH,
  method: "POST",
  request: AccountAcceptInviteRequestSchema,
  response: z.union([
    AccountAcceptInviteActionDataSuccessSchema,
    AccountAcceptInviteActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<AccountAcceptInviteRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: ACCOUNT_ACCEPT_INVITE_ROUTE.path,
    };
  },
} as const;
