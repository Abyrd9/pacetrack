import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH = "/api/account-group/get-by-id";

const AccountGroupGetByIdRequestSchema = z.object({
  accountGroupId: z.string(),
});

const AccountGroupGetByIdActionDataErrorSchema = ActionDataSchema(
  AccountGroupGetByIdRequestSchema,
  "error",
  ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH
);

const AccountGroupGetByIdActionDataSuccessSchema = ActionDataSchema(
  AccountGroupSchema,
  "ok",
  ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH
);

export type AccountGroupGetByIdRouteResponse = RouteResponse<
  typeof AccountGroupGetByIdActionDataSuccessSchema,
  typeof AccountGroupGetByIdActionDataErrorSchema
>;

export const ACCOUNT_GROUP_GET_BY_ID_ROUTE = {
  path: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
  method: "POST",
  request: AccountGroupGetByIdRequestSchema,
  response: z.union([
    AccountGroupGetByIdActionDataSuccessSchema,
    AccountGroupGetByIdActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<AccountGroupGetByIdRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: ACCOUNT_GROUP_GET_BY_ID_ROUTE.path,
    };
  },
} as const;
