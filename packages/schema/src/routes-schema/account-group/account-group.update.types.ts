import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const AccountGroupUpdateRequestSchema = AccountGroupSchema.pick({
	id: true,
	name: true,
	description: true,
	image_url: true,
}).extend({
	id: z.string(),
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	description: z.string().optional(),
	image_url: z.string().url().optional(),
});

export const ACCOUNT_GROUP_UPDATE_ROUTE_PATH = "/api/account-group/update";

export const AccountGroupUpdateActionDataErrorSchema = ActionDataSchema(
	AccountGroupUpdateRequestSchema,
	"error",
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
);

export const AccountGroupUpdateActionDataSuccessSchema = ActionDataSchema(
	AccountGroupSchema,
	"ok",
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
);

export type AccountGroupUpdateRouteResponse = RouteResponse<
	typeof AccountGroupUpdateActionDataSuccessSchema,
	typeof AccountGroupUpdateActionDataErrorSchema
>;

export const makeAccountGroupUpdateRouteResponse = (
	args: AccountGroupUpdateRouteResponse,
) => args;
