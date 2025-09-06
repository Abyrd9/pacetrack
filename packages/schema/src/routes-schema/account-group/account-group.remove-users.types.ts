import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for removing accounts from a account group
const AccountGroupRemoveAccountsRequestSchema = z.object({
  accountGroupId: z.string(),
  accountIds: z.array(z.string()).min(1),
});

// Route path constant
const ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE_PATH =
  "/api/account-group/remove-accounts";

// Action data schemas
const AccountGroupRemoveAccountsActionDataErrorSchema = ActionDataSchema(
  AccountGroupRemoveAccountsRequestSchema,
  "error",
  ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE_PATH
);

const AccountGroupRemoveAccountsActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE_PATH
);

// Route response type
export type AccountGroupRemoveAccountsRouteResponse = RouteResponse<
  typeof AccountGroupRemoveAccountsActionDataSuccessSchema,
  typeof AccountGroupRemoveAccountsActionDataErrorSchema
>;

export const ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE = {
  path: ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE_PATH,
  method: "POST",
  request: AccountGroupRemoveAccountsRequestSchema,
  response: z.union([
    AccountGroupRemoveAccountsActionDataSuccessSchema,
    AccountGroupRemoveAccountsActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<AccountGroupRemoveAccountsRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: ACCOUNT_GROUP_REMOVE_ACCOUNTS_ROUTE.path,
    };
  },
} as const;
