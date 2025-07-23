import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for creating a new account group
const AccountGroupCreateRequestSchema = AccountGroupSchema.pick({
	name: true,
	image_url: true,
	description: true,
	tenant_id: true,
	parent_group_id: true,
}).extend({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	image_url: z.string().url().optional(),
	description: z.string().optional(),
	tenant_id: z.string({ error: "Tenant ID is required" }).min(1, {
		message: "Tenant ID is required",
	}),
	parent_group_id: z.string().optional(),
});

// Route path constant
const ACCOUNT_GROUP_CREATE_ROUTE_PATH = "/api/account-group/create";

// Action data schemas
const AccountGroupCreateActionDataErrorSchema = ActionDataSchema(
	AccountGroupCreateRequestSchema,
	"error",
	ACCOUNT_GROUP_CREATE_ROUTE_PATH,
);

const AccountGroupCreateActionDataSuccessSchema = ActionDataSchema(
	AccountGroupSchema,
	"ok",
	ACCOUNT_GROUP_CREATE_ROUTE_PATH,
);

// Route response type
export type AccountGroupCreateRouteResponse = RouteResponse<
	typeof AccountGroupCreateActionDataSuccessSchema,
	typeof AccountGroupCreateActionDataErrorSchema
>;

export const ACCOUNT_GROUP_CREATE_ROUTE = {
	path: ACCOUNT_GROUP_CREATE_ROUTE_PATH,
	method: "POST",
	request: AccountGroupCreateRequestSchema,
	response: z.union([
		AccountGroupCreateActionDataSuccessSchema,
		AccountGroupCreateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<AccountGroupCreateRouteResponse, "key">) => {
		return {
			...args,
			key: ACCOUNT_GROUP_CREATE_ROUTE.path,
		};
	},
} as const;
