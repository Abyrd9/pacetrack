import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_SWITCH_ROUTE_PATH = "/api/account/switch";

export const AccountSwitchRequestSchema = z.object({
  tenantId: z.string(),
  targetAccountId: z.string().nullable(),
});

export const AccountSwitchActionDataErrorSchema = ActionDataSchema(
  AccountSwitchRequestSchema,
  "error",
  ACCOUNT_SWITCH_ROUTE_PATH
);

export const AccountSwitchActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  ACCOUNT_SWITCH_ROUTE_PATH
);

export type AccountSwitchRouteResponse = RouteResponse<
  typeof AccountSwitchActionDataSuccessSchema,
  typeof AccountSwitchActionDataErrorSchema
>;

export const makeAccountSwitchRouteResponse = (
  args: AccountSwitchRouteResponse
) => args;
