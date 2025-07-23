import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_GET_ROUTE_PATH = "/api/account/get";

export const AccountGetActionDataErrorSchema = ActionDataSchema(
  z.object({
    global: z.string(),
  }),
  "error",
  ACCOUNT_GET_ROUTE_PATH
);

export const AccountGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    accounts: z.array(AccountSchema),
  }),
  "ok",
  ACCOUNT_GET_ROUTE_PATH
);

export type AccountGetRouteResponse = RouteResponse<
  typeof AccountGetActionDataSuccessSchema,
  typeof AccountGetActionDataErrorSchema
>;

export const makeAccountGetRouteResponse = (args: AccountGetRouteResponse) =>
  args;
