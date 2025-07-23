import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const RESET_PASSWORD_VALIDATE_ROUTE_PATH = "/api/auth/reset-password-validate";

const ResetPasswordValidateRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
  code: z.string().min(1),
});

const ResetPasswordValidateActionDataErrorSchema = ActionDataSchema(
  ResetPasswordValidateRequestSchema,
  "error",
  RESET_PASSWORD_VALIDATE_ROUTE_PATH
);

const ResetPasswordValidateActionDataSuccessSchema = ActionDataSchema(
  ResetPasswordValidateRequestSchema,
  "ok",
  RESET_PASSWORD_VALIDATE_ROUTE_PATH
);

export type ResetPasswordValidateRouteResponse = RouteResponse<
  typeof ResetPasswordValidateActionDataSuccessSchema,
  typeof ResetPasswordValidateActionDataErrorSchema
>;

export const RESET_PASSWORD_VALIDATE_ROUTE = {
  path: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
  method: "POST",
  request: ResetPasswordValidateRequestSchema,
  response: z.union([
    ResetPasswordValidateActionDataSuccessSchema,
    ResetPasswordValidateActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<ResetPasswordValidateRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: RESET_PASSWORD_VALIDATE_ROUTE.path,
    };
  },
} as const;
