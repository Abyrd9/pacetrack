import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ACCOUNT_LINK_ROUTE_PATH = "/api/account/link";

const AccountLinkRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

const AccountLinkActionDataErrorSchema = ActionDataSchema(
  AccountLinkRequestSchema,
  "error",
  ACCOUNT_LINK_ROUTE_PATH
);

const AccountLinkActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  ACCOUNT_LINK_ROUTE_PATH
);

export type AccountLinkRouteResponse = RouteResponse<
  typeof AccountLinkActionDataSuccessSchema,
  typeof AccountLinkActionDataErrorSchema
>;

export const ACCOUNT_LINK_ROUTE = {
  path: ACCOUNT_LINK_ROUTE_PATH,
  method: "POST",
  request: AccountLinkRequestSchema,
  response: z.union([
    AccountLinkActionDataSuccessSchema,
    AccountLinkActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountLinkRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_LINK_ROUTE.path,
    };
  },
} as const;
