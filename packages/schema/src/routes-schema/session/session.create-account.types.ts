import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SessionCreateAccountRequestSchema = z
  .object({
    user_id: z.string({ error: "User ID is required" }).min(1, {
      message: "User ID is required",
    }),
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

const SESSION_CREATE_ACCOUNT_ROUTE_PATH = "/api/session/create-account";

const SessionCreateAccountActionDataErrorSchema = ActionDataSchema(
  SessionCreateAccountRequestSchema,
  "error",
  SESSION_CREATE_ACCOUNT_ROUTE_PATH
);

const SessionCreateAccountActionDataSuccessSchema = ActionDataSchema(
  z.object({
    user: UserSchema,
    account: AccountSchema,
    csrfToken: z.string(), // CSRF token for subsequent requests
  }),
  "ok",
  SESSION_CREATE_ACCOUNT_ROUTE_PATH
);

export type SessionCreateAccountRouteResponse = RouteResponse<
  typeof SessionCreateAccountActionDataSuccessSchema,
  typeof SessionCreateAccountActionDataErrorSchema
>;

export const SESSION_CREATE_ACCOUNT_ROUTE = {
  path: SESSION_CREATE_ACCOUNT_ROUTE_PATH,
  method: "POST",
  request: SessionCreateAccountRequestSchema,
  response: z.union([
    SessionCreateAccountActionDataSuccessSchema,
    SessionCreateAccountActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionCreateAccountRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_CREATE_ACCOUNT_ROUTE.path,
    };
  },
} as const;
