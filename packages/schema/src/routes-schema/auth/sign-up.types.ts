import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SignUpRequestSchema = z
  .object({
    email: z.email({
      error: (val) =>
        val.input === undefined ? "Email is required" : "Email is invalid",
    }),
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

const SIGN_UP_ROUTE_PATH = "/api/auth/sign-up";

const SignUpActionDataErrorSchema = ActionDataSchema(
  SignUpRequestSchema,
  "error",
  SIGN_UP_ROUTE_PATH
);
const SignUpActionDataSuccessSchema = ActionDataSchema(
  z.object({
    user: UserSchema,
    account: AccountSchema,
    csrfToken: z.string(), // CSRF token for subsequent requests
  }),
  "ok",
  SIGN_UP_ROUTE_PATH
);

export type SignUpRouteResponse = RouteResponse<
  typeof SignUpActionDataSuccessSchema,
  typeof SignUpActionDataErrorSchema
>;

export const SIGN_UP_ROUTE = {
  path: SIGN_UP_ROUTE_PATH,
  method: "POST",
  request: SignUpRequestSchema,
  response: z.union([
    SignUpActionDataSuccessSchema,
    SignUpActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SignUpRouteResponse, "key">) => {
    return {
      ...args,
      key: SIGN_UP_ROUTE.path,
    };
  },
} as const;
