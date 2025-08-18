import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH =
	"/api/account-group/get-by-id";

export const AccountGroupGetByIdRequestSchema = z.object({
	accountGroupId: z.string(),
});

export const AccountGroupGetByIdActionDataErrorSchema = ActionDataSchema(
	AccountGroupGetByIdRequestSchema,
	"error",
	ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
);

export const AccountGroupGetByIdActionDataSuccessSchema = ActionDataSchema(
	AccountGroupSchema,
	"ok",
	ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
);

export type AccountGroupGetByIdRouteResponse = RouteResponse<
	typeof AccountGroupGetByIdActionDataSuccessSchema,
	typeof AccountGroupGetByIdActionDataErrorSchema
>;

export const makeAccountGroupGetByIdRouteResponse = (
	args: AccountGroupGetByIdRouteResponse,
) => args;
