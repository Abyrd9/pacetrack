import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const CHANGE_EMAIL_ROUTE_PATH = "/api/account/change-email";

export const ChangeEmailRequestSchema = z.object({
	email: z.email({
		error: (val) =>
			val.input === undefined ? "Email is required" : "Email is invalid",
	}),
});

export const ChangeEmailActionDataErrorSchema = ActionDataSchema(
	ChangeEmailRequestSchema,
	"error",
	CHANGE_EMAIL_ROUTE_PATH,
);

export const ChangeEmailActionDataSuccessSchema = ActionDataSchema(
	ChangeEmailRequestSchema,
	"ok",
	CHANGE_EMAIL_ROUTE_PATH,
);

export type ChangeEmailRouteResponse = RouteResponse<
	typeof ChangeEmailActionDataSuccessSchema,
	typeof ChangeEmailActionDataErrorSchema
>;

export const makeChangeEmailRouteResponse = (args: ChangeEmailRouteResponse) =>
	args;
