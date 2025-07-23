import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for adding users to a user group
export const UserGroupAddUsersRequestSchema = z.object({
	userGroupId: z.string(),
	userIds: z.array(z.string()).min(1),
});

// Route path constant
export const USER_GROUP_ADD_USERS_ROUTE_PATH = "/api/user-group/add-users";

// Action data schemas
export const UserGroupAddUsersActionDataErrorSchema = ActionDataSchema(
	UserGroupAddUsersRequestSchema,
	"error",
	USER_GROUP_ADD_USERS_ROUTE_PATH,
);

export const UserGroupAddUsersActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	USER_GROUP_ADD_USERS_ROUTE_PATH,
);

// Route response type
export type UserGroupAddUsersRouteResponse = RouteResponse<
	typeof UserGroupAddUsersActionDataSuccessSchema,
	typeof UserGroupAddUsersActionDataErrorSchema
>;

export const makeUserGroupAddUsersRouteResponse = (
	args: UserGroupAddUsersRouteResponse,
) => args;
