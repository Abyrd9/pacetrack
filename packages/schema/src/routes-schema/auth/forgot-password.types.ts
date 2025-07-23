import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const FORGOT_PASSWORD_ROUTE_PATH = "/api/auth/forgot-password";

export const ForgotPasswordRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
});

export const ForgotPasswordActionDataErrorSchema = ActionDataSchema(
  ForgotPasswordRequestSchema,
  "error",
  FORGOT_PASSWORD_ROUTE_PATH
);

export const ForgotPasswordActionDataSuccessSchema = ActionDataSchema(
  ForgotPasswordRequestSchema,
  "ok",
  FORGOT_PASSWORD_ROUTE_PATH
);

export type ForgotPasswordRouteResponse = RouteResponse<
  typeof ForgotPasswordActionDataSuccessSchema,
  typeof ForgotPasswordActionDataErrorSchema
>;

export const makeForgotPasswordRouteResponse = (
  args: ForgotPasswordRouteResponse
) => args;
