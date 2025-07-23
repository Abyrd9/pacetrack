import { z } from "zod/v4";
import { UserGroupSchema } from "../../db-schema/user-group";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const USER_GROUP_GET_BY_ID_ROUTE_PATH = "/api/user-group/get-by-id";

export const UserGroupGetByIdRequestSchema = z.object({
	userGroupId: z.string(),
});

export const UserGroupGetByIdActionDataErrorSchema = ActionDataSchema(
	UserGroupGetByIdRequestSchema,
	"error",
	USER_GROUP_GET_BY_ID_ROUTE_PATH,
);

export const UserGroupGetByIdActionDataSuccessSchema = ActionDataSchema(
	UserGroupSchema,
	"ok",
	USER_GROUP_GET_BY_ID_ROUTE_PATH,
);

export type UserGroupGetByIdRouteResponse = RouteResponse<
	typeof UserGroupGetByIdActionDataSuccessSchema,
	typeof UserGroupGetByIdActionDataErrorSchema
>;

export const makeUserGroupGetByIdRouteResponse = (
	args: UserGroupGetByIdRouteResponse,
) => args;
