import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ResetPasswordRequestSchema = z
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
    }
  );

const RESET_PASSWORD_ROUTE_PATH = "/api/auth/reset-password";

const ResetPasswordActionDataErrorSchema = ActionDataSchema(
  ResetPasswordRequestSchema,
  "error",
  RESET_PASSWORD_ROUTE_PATH
);

const ResetPasswordActionDataSuccessSchema = ActionDataSchema(
  ResetPasswordRequestSchema,
  "ok",
  RESET_PASSWORD_ROUTE_PATH
);

export type ResetPasswordRouteResponse = RouteResponse<
  typeof ResetPasswordActionDataSuccessSchema,
  typeof ResetPasswordActionDataErrorSchema
>;

export const RESET_PASSWORD_ROUTE = {
  path: RESET_PASSWORD_ROUTE_PATH,
  method: "POST",
  request: ResetPasswordRequestSchema,
  response: z.union([
    ResetPasswordActionDataSuccessSchema,
    ResetPasswordActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<ResetPasswordRouteResponse, "key">) => {
    return {
      ...args,
      key: RESET_PASSWORD_ROUTE.path,
    };
  },
} as const;
