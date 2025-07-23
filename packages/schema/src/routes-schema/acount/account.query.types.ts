import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountQueryRequestSchema = z.object({
  term: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

const ACCOUNT_QUERY_ROUTE_PATH = "/api/account/query";

const AccountQueryActionDataErrorSchema = ActionDataSchema(
  AccountQueryRequestSchema,
  "error",
  ACCOUNT_QUERY_ROUTE_PATH
);

const AccountQueryActionDataSuccessSchema = ActionDataSchema(
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
  ACCOUNT_QUERY_ROUTE_PATH
);

export type AccountQueryRouteResponse = RouteResponse<
  typeof AccountQueryActionDataSuccessSchema,
  typeof AccountQueryActionDataErrorSchema
>;

export const ACCOUNT_QUERY_ROUTE = {
  path: ACCOUNT_QUERY_ROUTE_PATH,
  method: "GET",
  request: AccountQueryRequestSchema,
  response: z.union([
    AccountQueryActionDataSuccessSchema,
    AccountQueryActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountQueryRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_QUERY_ROUTE.path,
    };
  },
} as const;
