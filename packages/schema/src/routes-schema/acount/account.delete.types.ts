import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_DELETE_ROUTE_PATH = "/api/account/delete";

export const AccountDeleteRequestSchema = z.object({
	accountId: z.string(),
});

export const AccountDeleteActionDataErrorSchema = ActionDataSchema(
	AccountDeleteRequestSchema,
	"error",
	ACCOUNT_DELETE_ROUTE_PATH,
);

export const AccountDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	ACCOUNT_DELETE_ROUTE_PATH,
);

export type AccountDeleteRouteResponse = RouteResponse<
	typeof AccountDeleteActionDataSuccessSchema,
	typeof AccountDeleteActionDataErrorSchema
>;

export const makeAccountDeleteRouteResponse = (
	args: AccountDeleteRouteResponse,
) => args;
