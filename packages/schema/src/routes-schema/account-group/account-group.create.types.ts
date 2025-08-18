import { z } from "zod/v4";
import { AccountGroupSchema } from "../../db-schema/account-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for creating a new account group
export const AccountGroupCreateRequestSchema = AccountGroupSchema.pick({
	name: true,
	image_url: true,
	description: true,
	tenant_id: true,
}).extend({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	image_url: z.string().url().optional(),
	description: z.string().optional(),
	tenant_id: z.string({ error: "Tenant ID is required" }).min(1, {
		message: "Tenant ID is required",
	}),
});

// Route path constant
export const ACCOUNT_GROUP_CREATE_ROUTE_PATH = "/api/account-group/create";

// Action data schemas
export const AccountGroupCreateActionDataErrorSchema = ActionDataSchema(
	AccountGroupCreateRequestSchema,
	"error",
	ACCOUNT_GROUP_CREATE_ROUTE_PATH,
);

export const AccountGroupCreateActionDataSuccessSchema = ActionDataSchema(
	AccountGroupSchema,
	"ok",
	ACCOUNT_GROUP_CREATE_ROUTE_PATH,
);

// Route response type
export type AccountGroupCreateRouteResponse = RouteResponse<
	typeof AccountGroupCreateActionDataSuccessSchema,
	typeof AccountGroupCreateActionDataErrorSchema
>;

// Helper to make typed responses easier
export const makeAccountGroupCreateRouteResponse = (
	args: AccountGroupCreateRouteResponse,
) => args;
