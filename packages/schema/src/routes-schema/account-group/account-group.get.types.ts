import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema to allow pagination and scope
const AccountGroupGetRequestSchema = z.object({
  scope: z.enum(["account", "tenant"]).optional(), // default "account"
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

const ACCOUNT_GROUP_GET_ROUTE_PATH = "/api/account-group/get";

// Error schema can reference request fields for validation errors
const AccountGroupGetActionDataErrorSchema = ActionDataSchema(
  AccountGroupGetRequestSchema,
  "error",
  ACCOUNT_GROUP_GET_ROUTE_PATH
);

// Success schema includes optional pagination metadata
const AccountGroupGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    accountGroups: z.array(AccountGroupSchema),
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
  ACCOUNT_GROUP_GET_ROUTE_PATH
);

export type AccountGroupGetRouteResponse = RouteResponse<
  typeof AccountGroupGetActionDataSuccessSchema,
  typeof AccountGroupGetActionDataErrorSchema
>;

export const ACCOUNT_GROUP_GET_ROUTE = {
  path: ACCOUNT_GROUP_GET_ROUTE_PATH,
  method: "GET",
  request: AccountGroupGetRequestSchema,
  response: z.union([
    AccountGroupGetActionDataSuccessSchema,
    AccountGroupGetActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountGroupGetRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_GROUP_GET_ROUTE.path,
    };
  },
} as const;
