import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const UpdatePasswordRequestSchema = z
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

const UPDATE_PASSWORD_ROUTE_PATH = "/api/account/update-password";

const UpdatePasswordActionDataErrorSchema = ActionDataSchema(
  UpdatePasswordRequestSchema,
  "error",
  UPDATE_PASSWORD_ROUTE_PATH
);

const UpdatePasswordActionDataSuccessSchema = ActionDataSchema(
  z.object({}),
  "ok",
  UPDATE_PASSWORD_ROUTE_PATH
);

export type UpdatePasswordRouteResponse = RouteResponse<
  typeof UpdatePasswordActionDataSuccessSchema,
  typeof UpdatePasswordActionDataErrorSchema
>;

export const ACCOUNT_UPDATE_PASSWORD_ROUTE = {
  path: UPDATE_PASSWORD_ROUTE_PATH,
  method: "POST",
  request: UpdatePasswordRequestSchema,
  response: z.union([
    UpdatePasswordActionDataSuccessSchema,
    UpdatePasswordActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<UpdatePasswordRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_UPDATE_PASSWORD_ROUTE.path,
    };
  },
} as const;
