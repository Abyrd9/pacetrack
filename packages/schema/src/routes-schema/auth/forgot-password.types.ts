import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const FORGOT_PASSWORD_ROUTE_PATH = "/api/auth/forgot-password";

const ForgotPasswordRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
});

const ForgotPasswordActionDataErrorSchema = ActionDataSchema(
  ForgotPasswordRequestSchema,
  "error",
  FORGOT_PASSWORD_ROUTE_PATH
);

const ForgotPasswordActionDataSuccessSchema = ActionDataSchema(
  ForgotPasswordRequestSchema,
  "ok",
  FORGOT_PASSWORD_ROUTE_PATH
);

export type ForgotPasswordRouteResponse = RouteResponse<
  typeof ForgotPasswordActionDataSuccessSchema,
  typeof ForgotPasswordActionDataErrorSchema
>;

export const FORGOT_PASSWORD_ROUTE = {
  path: FORGOT_PASSWORD_ROUTE_PATH,
  method: "POST",
  request: ForgotPasswordRequestSchema,
  response: z.union([
    ForgotPasswordActionDataSuccessSchema,
    ForgotPasswordActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<ForgotPasswordRouteResponse, "key">) => {
    return {
      ...args,
      key: FORGOT_PASSWORD_ROUTE.path,
    };
  },
} as const;
