import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const RESET_PASSWORD_VALIDATE_ROUTE_PATH =
	"/api/auth/reset-password-validate";

export const ResetPasswordValidateRequestSchema = z.object({
	email: z.email({
		error: (val) =>
			val.input === undefined ? "Email is required" : "Email is invalid",
	}),
	code: z.string().min(1),
});

export const ResetPasswordValidateActionDataErrorSchema = ActionDataSchema(
	ResetPasswordValidateRequestSchema,
	"error",
	RESET_PASSWORD_VALIDATE_ROUTE_PATH,
);

export const ResetPasswordValidateActionDataSuccessSchema = ActionDataSchema(
	ResetPasswordValidateRequestSchema,
	"ok",
	RESET_PASSWORD_VALIDATE_ROUTE_PATH,
);

export type ResetPasswordValidateRouteResponse = RouteResponse<
	typeof ResetPasswordValidateActionDataSuccessSchema,
	typeof ResetPasswordValidateActionDataErrorSchema
>;

export const makeResetPasswordValidateRouteResponse = (
	args: ResetPasswordValidateRouteResponse,
) => args;
