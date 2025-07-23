import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ACCOUNT_GET_BY_ID_ROUTE_PATH = "/api/account/get-by-id";

const AccountGetByIdRequestSchema = z.object({
  accountId: z.string(),
});

const AccountGetByIdActionDataErrorSchema = ActionDataSchema(
  AccountGetByIdRequestSchema,
  "error",
  ACCOUNT_GET_BY_ID_ROUTE_PATH
);

const AccountGetByIdActionDataSuccessSchema = ActionDataSchema(
  AccountSchema,
  "ok",
  ACCOUNT_GET_BY_ID_ROUTE_PATH
);

export type AccountGetByIdRouteResponse = RouteResponse<
  typeof AccountGetByIdActionDataSuccessSchema,
  typeof AccountGetByIdActionDataErrorSchema
>;

export const ACCOUNT_GET_BY_ID_ROUTE = {
  path: ACCOUNT_GET_BY_ID_ROUTE_PATH,
  method: "POST",
  request: AccountGetByIdRequestSchema,
  response: z.union([
    AccountGetByIdActionDataSuccessSchema,
    AccountGetByIdActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountGetByIdRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_GET_BY_ID_ROUTE.path,
    };
  },
} as const;
