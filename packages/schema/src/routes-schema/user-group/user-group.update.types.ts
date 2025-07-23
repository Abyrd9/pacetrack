import { z } from "zod/v4";
import { UserGroupSchema } from "../../db-schema/user-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UserGroupUpdateRequestSchema = UserGroupSchema.pick({
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

export const USER_GROUP_UPDATE_ROUTE_PATH = "/api/user-group/update";

export const UserGroupUpdateActionDataErrorSchema = ActionDataSchema(
	UserGroupUpdateRequestSchema,
	"error",
	USER_GROUP_UPDATE_ROUTE_PATH,
);

export const UserGroupUpdateActionDataSuccessSchema = ActionDataSchema(
	UserGroupSchema,
	"ok",
	USER_GROUP_UPDATE_ROUTE_PATH,
);

export type UserGroupUpdateRouteResponse = RouteResponse<
	typeof UserGroupUpdateActionDataSuccessSchema,
	typeof UserGroupUpdateActionDataErrorSchema
>;

export const makeUserGroupUpdateRouteResponse = (
	args: UserGroupUpdateRouteResponse,
) => args;
