import { z } from "zod/v4";
import { UserGroupSchema } from "../../db-schema/user-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema to allow pagination and scope
export const UserGroupGetRequestSchema = z.object({
	scope: z.enum(["user", "tenant"]).optional(), // default "user"
	page: z.coerce.number().int().positive().optional(),
	perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const USER_GROUP_GET_ROUTE_PATH = "/api/user-group/get";

// Error schema can reference request fields for validation errors
export const UserGroupGetActionDataErrorSchema = ActionDataSchema(
	UserGroupGetRequestSchema,
	"error",
	USER_GROUP_GET_ROUTE_PATH,
);

// Success schema includes optional pagination metadata
export const UserGroupGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		userGroups: z.array(UserGroupSchema),
		pagination: z
			.object({
				total: z.number(),
				page: z.number(),
				perPage: z.number(),
				totalPages: z.number(),
			})
			.optional(),
	}),
	"ok",
	USER_GROUP_GET_ROUTE_PATH,
);

export type UserGroupGetRouteResponse = RouteResponse<
	typeof UserGroupGetActionDataSuccessSchema,
	typeof UserGroupGetActionDataErrorSchema
>;

export const makeUserGroupGetRouteResponse = (
	args: UserGroupGetRouteResponse,
) => args;
