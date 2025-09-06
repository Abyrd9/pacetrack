import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountGetRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

const ACCOUNT_GET_ROUTE_PATH = "/api/account/get";

const AccountGetActionDataErrorSchema = ActionDataSchema(
  AccountGetRequestSchema,
  "error",
  ACCOUNT_GET_ROUTE_PATH
);

const AccountGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    accounts: z.array(AccountSchema),
    pagination: z
      .object({
        total: z.number(),
        page: z.number(),
        perPage: z.number(),
        totalPages: z.number(),
      })
      .optional(),
  }),
  "ok",
  ACCOUNT_GET_ROUTE_PATH
);

export type AccountGetRouteResponse = RouteResponse<
  typeof AccountGetActionDataSuccessSchema,
  typeof AccountGetActionDataErrorSchema
>;

export const ACCOUNT_GET_ROUTE = {
  path: ACCOUNT_GET_ROUTE_PATH,
  method: "GET",
  request: AccountGetRequestSchema,
  response: z.union([
    AccountGetActionDataSuccessSchema,
    AccountGetActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountGetRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_GET_ROUTE.path,
    };
  },
} as const;
