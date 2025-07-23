import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountGroupUpdateRequestSchema = AccountGroupSchema.pick({
	id: true,
	name: true,
	description: true,
	image_url: true,
	parent_group_id: true,
}).extend({
	id: z.string(),
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	description: z.string().optional(),
	image_url: z.string().url().optional(),
	parent_group_id: z.string().optional(),
});

const ACCOUNT_GROUP_UPDATE_ROUTE_PATH = "/api/account-group/update";

const AccountGroupUpdateActionDataErrorSchema = ActionDataSchema(
	AccountGroupUpdateRequestSchema,
	"error",
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
);

const AccountGroupUpdateActionDataSuccessSchema = ActionDataSchema(
	AccountGroupSchema,
	"ok",
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
);

export type AccountGroupUpdateRouteResponse = RouteResponse<
	typeof AccountGroupUpdateActionDataSuccessSchema,
	typeof AccountGroupUpdateActionDataErrorSchema
>;

export const ACCOUNT_GROUP_UPDATE_ROUTE = {
	path: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
	method: "POST",
	request: AccountGroupUpdateRequestSchema,
	response: z.union([
		AccountGroupUpdateActionDataSuccessSchema,
		AccountGroupUpdateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<AccountGroupUpdateRouteResponse, "key">) => {
		return {
			...args,
			key: ACCOUNT_GROUP_UPDATE_ROUTE.path,
		};
	},
} as const;
