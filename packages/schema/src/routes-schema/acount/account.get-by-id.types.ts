import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_GET_BY_ID_ROUTE_PATH = "/api/account/get-by-id";

export const AccountGetByIdRequestSchema = z.object({
	accountId: z.string(),
});

export const AccountGetByIdActionDataErrorSchema = ActionDataSchema(
	AccountGetByIdRequestSchema,
	"error",
	ACCOUNT_GET_BY_ID_ROUTE_PATH,
);

export const AccountGetByIdActionDataSuccessSchema = ActionDataSchema(
	AccountSchema,
	"ok",
	ACCOUNT_GET_BY_ID_ROUTE_PATH,
);

export type AccountGetByIdRouteResponse = RouteResponse<
	typeof AccountGetByIdActionDataSuccessSchema,
	typeof AccountGetByIdActionDataErrorSchema
>;

export const makeAccountGetByIdRouteResponse = (
	args: AccountGetByIdRouteResponse,
) => args;
