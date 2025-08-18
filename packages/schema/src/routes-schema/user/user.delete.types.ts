import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const USER_DELETE_ROUTE_PATH = "/api/user/delete";

export const UserDeleteRequestSchema = z.object({
	userId: z.string(),
});

export const UserDeleteActionDataErrorSchema = ActionDataSchema(
	UserDeleteRequestSchema,
	"error",
	USER_DELETE_ROUTE_PATH,
);

export const UserDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	USER_DELETE_ROUTE_PATH,
);

export type UserDeleteRouteResponse = RouteResponse<
	typeof UserDeleteActionDataSuccessSchema,
	typeof UserDeleteActionDataErrorSchema
>;

export const makeUserDeleteRouteResponse = (args: UserDeleteRouteResponse) =>
	args;
