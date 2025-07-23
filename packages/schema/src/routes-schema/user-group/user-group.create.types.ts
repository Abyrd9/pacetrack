import { z } from "zod/v4";
import { UserGroupSchema } from "../../db-schema/user-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for creating a new user group
export const UserGroupCreateRequestSchema = UserGroupSchema.pick({
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
export const USER_GROUP_CREATE_ROUTE_PATH = "/api/user-group/create";

// Action data schemas
export const UserGroupCreateActionDataErrorSchema = ActionDataSchema(
	UserGroupCreateRequestSchema,
	"error",
	USER_GROUP_CREATE_ROUTE_PATH,
);

export const UserGroupCreateActionDataSuccessSchema = ActionDataSchema(
	UserGroupSchema,
	"ok",
	USER_GROUP_CREATE_ROUTE_PATH,
);

// Route response type
export type UserGroupCreateRouteResponse = RouteResponse<
	typeof UserGroupCreateActionDataSuccessSchema,
	typeof UserGroupCreateActionDataErrorSchema
>;

// Helper to make typed responses easier
export const makeUserGroupCreateRouteResponse = (
	args: UserGroupCreateRouteResponse,
) => args;
