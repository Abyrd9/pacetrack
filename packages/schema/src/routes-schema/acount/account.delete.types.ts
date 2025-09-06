import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ACCOUNT_DELETE_ROUTE_PATH = "/api/account/delete";

const AccountDeleteRequestSchema = z.object({
  accountId: z.string(),
});

const AccountDeleteActionDataErrorSchema = ActionDataSchema(
  AccountDeleteRequestSchema,
  "error",
  ACCOUNT_DELETE_ROUTE_PATH
);

const AccountDeleteActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  ACCOUNT_DELETE_ROUTE_PATH
);

export type AccountDeleteRouteResponse = RouteResponse<
  typeof AccountDeleteActionDataSuccessSchema,
  typeof AccountDeleteActionDataErrorSchema
>;

export const ACCOUNT_DELETE_ROUTE = {
  path: ACCOUNT_DELETE_ROUTE_PATH,
  method: "POST",
  request: AccountDeleteRequestSchema,
  response: z.union([
    AccountDeleteActionDataSuccessSchema,
    AccountDeleteActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountDeleteRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_DELETE_ROUTE.path,
    };
  },
} as const;
