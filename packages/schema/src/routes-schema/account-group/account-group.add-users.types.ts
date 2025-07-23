import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for adding accounts to a account group
const AccountGroupAddAccountsRequestSchema = z.object({
  accountGroupId: z.string(),
  accountIds: z.array(z.string()).min(1),
});

// Route path constant
const ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH = "/api/account-group/add-accounts";

// Action data schemas
const AccountGroupAddAccountsActionDataErrorSchema = ActionDataSchema(
  AccountGroupAddAccountsRequestSchema,
  "error",
  ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH
);

const AccountGroupAddAccountsActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH
);

// Route response type
export type AccountGroupAddAccountsRouteResponse = RouteResponse<
  typeof AccountGroupAddAccountsActionDataSuccessSchema,
  typeof AccountGroupAddAccountsActionDataErrorSchema
>;

export const ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE = {
  path: ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH,
  method: "POST",
  request: AccountGroupAddAccountsRequestSchema,
  response: z.union([
    AccountGroupAddAccountsActionDataSuccessSchema,
    AccountGroupAddAccountsActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<AccountGroupAddAccountsRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path,
    };
  },
} as const;
