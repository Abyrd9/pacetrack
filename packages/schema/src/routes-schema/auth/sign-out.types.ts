import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SignOutSuccessSchema = ActionDataSchema(
  z.object({}),
  "ok",
  "/api/auth/sign-out"
);

const SignOutErrorSchema = ActionDataSchema(
  z.object({
    global: z.string().optional(),
  }),
  "error",
  "/api/auth/sign-out"
);

export type SignOutRouteResponse = RouteResponse<
  typeof SignOutSuccessSchema,
  typeof SignOutErrorSchema
>;

const SIGN_OUT_ROUTE_PATH = "/api/auth/sign-out";

export const SIGN_OUT_ROUTE = {
  path: SIGN_OUT_ROUTE_PATH,
  method: "POST",
  response: z.discriminatedUnion("status", [
    SignOutSuccessSchema,
    SignOutErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SignOutRouteResponse, "key">) => {
    return {
      ...args,
      key: SIGN_OUT_ROUTE.path,
    };
  },
} as const;
