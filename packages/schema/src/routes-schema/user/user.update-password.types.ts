import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UpdatePasswordRequestSchema = z
  .object({
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

export const UPDATE_PASSWORD_ROUTE_PATH = "/api/user/update-password";

export const UpdatePasswordActionDataErrorSchema = ActionDataSchema(
  UpdatePasswordRequestSchema,
  "error",
  UPDATE_PASSWORD_ROUTE_PATH
);

export const UpdatePasswordActionDataSuccessSchema = ActionDataSchema(
  z.object({}),
  "ok",
  UPDATE_PASSWORD_ROUTE_PATH
);

export type UpdatePasswordRouteResponse = RouteResponse<
  typeof UpdatePasswordActionDataSuccessSchema,
  typeof UpdatePasswordActionDataErrorSchema
>;

export const makeUpdatePasswordRouteResponse = (
  args: UpdatePasswordRouteResponse
) => args;
