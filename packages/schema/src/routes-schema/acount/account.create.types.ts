import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountCreateRequestSchema = z
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

const ACCOUNT_CREATE_ROUTE_PATH = "/api/account/create";

const AccountCreateActionDataErrorSchema = ActionDataSchema(
  AccountCreateRequestSchema,
  "error",
  ACCOUNT_CREATE_ROUTE_PATH
);

const AccountCreateActionDataSuccessSchema = ActionDataSchema(
  z.object({
    user: UserSchema,
    account: AccountSchema,
  }),
  "ok",
  ACCOUNT_CREATE_ROUTE_PATH
);

export type AccountCreateRouteResponse = RouteResponse<
  typeof AccountCreateActionDataSuccessSchema,
  typeof AccountCreateActionDataErrorSchema
>;

export const ACCOUNT_CREATE_ROUTE = {
  path: ACCOUNT_CREATE_ROUTE_PATH,
  method: "POST",
  request: AccountCreateRequestSchema,
  response: z.union([
    AccountCreateActionDataSuccessSchema,
    AccountCreateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountCreateRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_CREATE_ROUTE.path,
    };
  },
} as const;
