import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ResetPasswordRequestSchema = z
	.object({
		email: z.email(),
		code: z.string().min(1),
		password: z
			.string({ error: "Password is required" })
			.min(8, "Password must be at least 8 characters"),
		passwordConfirmation: z
			.string({ error: "Password confirmation is required" })
			.min(8, "Password must be at least 8 characters"),
	})
	.refine(
		(value) => {
			return value.password === value.passwordConfirmation;
		},
		{
			message: "Passwords do not match",
			path: ["passwordConfirmation"],
		},
	);

export const RESET_PASSWORD_ROUTE_PATH = "/api/auth/reset-password";

export const ResetPasswordActionDataErrorSchema = ActionDataSchema(
	ResetPasswordRequestSchema,
	"error",
	RESET_PASSWORD_ROUTE_PATH,
);

export const ResetPasswordActionDataSuccessSchema = ActionDataSchema(
	ResetPasswordRequestSchema,
	"ok",
	RESET_PASSWORD_ROUTE_PATH,
);

export type ResetPasswordRouteResponse = RouteResponse<
	typeof ResetPasswordActionDataSuccessSchema,
	typeof ResetPasswordActionDataErrorSchema
>;

export const makeResetPasswordRouteResponse = (
	args: ResetPasswordRouteResponse,
) => args;
