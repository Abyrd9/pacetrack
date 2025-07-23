import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SIGN_IN_ROUTE_PATH = "/api/auth/sign-in";

const SignInRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

const SignInActionDataErrorSchema = ActionDataSchema(
  SignInRequestSchema,
  "error",
  SIGN_IN_ROUTE_PATH
);

const SignInActionDataSuccessSchema = ActionDataSchema(
  z.object({
    user: UserSchema,
    account: AccountSchema,
    csrfToken: z.string(), // CSRF token for subsequent requests
  }),
  "ok",
  SIGN_IN_ROUTE_PATH
);

export type SignInRouteResponse = RouteResponse<
  typeof SignInActionDataSuccessSchema,
  typeof SignInActionDataErrorSchema
>;

export const SIGN_IN_ROUTE = {
  path: SIGN_IN_ROUTE_PATH,
  method: "POST",
  request: SignInRequestSchema,
  response: z.union([
    SignInActionDataSuccessSchema,
    SignInActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SignInRouteResponse, "key">) => {
    return {
      ...args,
      key: SIGN_IN_ROUTE.path,
    };
  },
} as const;
