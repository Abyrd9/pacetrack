import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UserCreateRequestSchema = z.object({
	display_name: z.string().optional(),
});

export const USER_CREATE_ROUTE_PATH = "/api/user/create";

export const UserCreateActionDataErrorSchema = ActionDataSchema(
	UserCreateRequestSchema,
	"error",
	USER_CREATE_ROUTE_PATH,
);
export const UserCreateActionDataSuccessSchema = ActionDataSchema(
	UserSchema,
	"ok",
	USER_CREATE_ROUTE_PATH,
);

export type UserCreateRouteResponse = RouteResponse<
	typeof UserCreateActionDataSuccessSchema,
	typeof UserCreateActionDataErrorSchema
>;

export const makeUserCreateRouteResponse = (args: UserCreateRouteResponse) =>
	args;
