import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const CHANGE_EMAIL_ROUTE_PATH = "/api/account/change-email";

const ChangeEmailRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
});

const ChangeEmailActionDataErrorSchema = ActionDataSchema(
  ChangeEmailRequestSchema,
  "error",
  CHANGE_EMAIL_ROUTE_PATH
);

const ChangeEmailActionDataSuccessSchema = ActionDataSchema(
  ChangeEmailRequestSchema,
  "ok",
  CHANGE_EMAIL_ROUTE_PATH
);

export type ChangeEmailRouteResponse = RouteResponse<
  typeof ChangeEmailActionDataSuccessSchema,
  typeof ChangeEmailActionDataErrorSchema
>;

export const ACCOUNT_CHANGE_EMAIL_ROUTE = {
  path: CHANGE_EMAIL_ROUTE_PATH,
  method: "POST",
  request: ChangeEmailRequestSchema,
  response: z.union([
    ChangeEmailActionDataSuccessSchema,
    ChangeEmailActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<ChangeEmailRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_CHANGE_EMAIL_ROUTE.path,
    };
  },
} as const;
