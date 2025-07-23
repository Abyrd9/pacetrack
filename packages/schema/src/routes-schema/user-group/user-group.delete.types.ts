import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const USER_GROUP_DELETE_ROUTE_PATH = "/api/user-group/delete";

export const UserGroupDeleteRequestSchema = z.object({
	userGroupId: z.string(),
});

export const UserGroupDeleteActionDataErrorSchema = ActionDataSchema(
	UserGroupDeleteRequestSchema,
	"error",
	USER_GROUP_DELETE_ROUTE_PATH,
);

export const UserGroupDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	USER_GROUP_DELETE_ROUTE_PATH,
);

export type UserGroupDeleteRouteResponse = RouteResponse<
	typeof UserGroupDeleteActionDataSuccessSchema,
	typeof UserGroupDeleteActionDataErrorSchema
>;

export const makeUserGroupDeleteRouteResponse = (
	args: UserGroupDeleteRouteResponse,
) => args;
