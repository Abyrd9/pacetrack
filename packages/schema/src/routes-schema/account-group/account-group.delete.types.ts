import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_GROUP_DELETE_ROUTE_PATH = "/api/account-group/delete";

export const AccountGroupDeleteRequestSchema = z.object({
	accountGroupId: z.string(),
});

export const AccountGroupDeleteActionDataErrorSchema = ActionDataSchema(
	AccountGroupDeleteRequestSchema,
	"error",
	ACCOUNT_GROUP_DELETE_ROUTE_PATH,
);

export const AccountGroupDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	ACCOUNT_GROUP_DELETE_ROUTE_PATH,
);

export type AccountGroupDeleteRouteResponse = RouteResponse<
	typeof AccountGroupDeleteActionDataSuccessSchema,
	typeof AccountGroupDeleteActionDataErrorSchema
>;

export const makeAccountGroupDeleteRouteResponse = (
	args: AccountGroupDeleteRouteResponse,
) => args;
