import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_CREATE_ROUTE_PATH = "/api/account/create";

export const AccountCreateRequestSchema = z.object({
  tenantId: z.string(),
});

export const AccountCreateActionDataErrorSchema = ActionDataSchema(
  AccountCreateRequestSchema,
  "error",
  ACCOUNT_CREATE_ROUTE_PATH
);

export const AccountCreateActionDataSuccessSchema = ActionDataSchema(
  AccountSchema,
  "ok",
  ACCOUNT_CREATE_ROUTE_PATH
);

export type AccountCreateRouteResponse = RouteResponse<
  typeof AccountCreateActionDataSuccessSchema,
  typeof AccountCreateActionDataErrorSchema
>;

export const makeAccountCreateRouteResponse = (
  args: AccountCreateRouteResponse
) => args;
