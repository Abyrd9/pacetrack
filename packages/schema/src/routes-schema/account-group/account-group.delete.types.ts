import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ACCOUNT_GROUP_DELETE_ROUTE_PATH = "/api/account-group/delete";

const AccountGroupDeleteRequestSchema = z.object({
  accountGroupId: z.string(),
});

const AccountGroupDeleteActionDataErrorSchema = ActionDataSchema(
  AccountGroupDeleteRequestSchema,
  "error",
  ACCOUNT_GROUP_DELETE_ROUTE_PATH
);

const AccountGroupDeleteActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  ACCOUNT_GROUP_DELETE_ROUTE_PATH
);

export type AccountGroupDeleteRouteResponse = RouteResponse<
  typeof AccountGroupDeleteActionDataSuccessSchema,
  typeof AccountGroupDeleteActionDataErrorSchema
>;

export const ACCOUNT_GROUP_DELETE_ROUTE = {
  path: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
  method: "POST",
  request: AccountGroupDeleteRequestSchema,
  response: z.union([
    AccountGroupDeleteActionDataSuccessSchema,
    AccountGroupDeleteActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountGroupDeleteRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_GROUP_DELETE_ROUTE.path,
    };
  },
} as const;
