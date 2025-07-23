import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for removing users from a user group
export const UserGroupRemoveUsersRequestSchema = z.object({
	userGroupId: z.string(),
	userIds: z.array(z.string()).min(1),
});

export const USER_GROUP_REMOVE_USERS_ROUTE_PATH =
	"/api/user-group/remove-users";

// Action data schemas
export const UserGroupRemoveUsersActionDataErrorSchema = ActionDataSchema(
	UserGroupRemoveUsersRequestSchema,
	"error",
	USER_GROUP_REMOVE_USERS_ROUTE_PATH,
);

export const UserGroupRemoveUsersActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	USER_GROUP_REMOVE_USERS_ROUTE_PATH,
);

// Route response type
export type UserGroupRemoveUsersRouteResponse = RouteResponse<
	typeof UserGroupRemoveUsersActionDataSuccessSchema,
	typeof UserGroupRemoveUsersActionDataErrorSchema
>;

export const makeUserGroupRemoveUsersRouteResponse = (
	args: UserGroupRemoveUsersRouteResponse,
) => args;
