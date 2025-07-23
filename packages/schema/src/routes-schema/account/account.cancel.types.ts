import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_CANCEL_ROUTE_PATH = "/api/account/cancel";

export const AccountCancelRequestSchema = z.object({
  accountId: z.string(),
});

export const AccountCancelActionDataErrorSchema = ActionDataSchema(
  AccountCancelRequestSchema,
  "error",
  ACCOUNT_CANCEL_ROUTE_PATH
);

export const AccountCancelActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  ACCOUNT_CANCEL_ROUTE_PATH
);

export type AccountCancelRouteResponse = RouteResponse<
  typeof AccountCancelActionDataSuccessSchema,
  typeof AccountCancelActionDataErrorSchema
>;

export const makeAccountCancelRouteResponse = (
  args: AccountCancelRouteResponse
) => args;