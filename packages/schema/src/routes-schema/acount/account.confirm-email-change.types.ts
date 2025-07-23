import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const CONFIRM_EMAIL_CHANGE_ROUTE_PATH = "/api/account/confirm-email-change";

const ConfirmEmailChangeRequestSchema = z.object({
  email: z.email(),
  token: z.string().min(1),
});

const ConfirmEmailChangeActionDataErrorSchema = ActionDataSchema(
  ConfirmEmailChangeRequestSchema,
  "error",
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH
);

const ConfirmEmailChangeActionDataSuccessSchema = ActionDataSchema(
  ConfirmEmailChangeRequestSchema,
  "ok",
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH
);

export type ConfirmEmailChangeRouteResponse = RouteResponse<
  typeof ConfirmEmailChangeActionDataSuccessSchema,
  typeof ConfirmEmailChangeActionDataErrorSchema
>;

export const ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE = {
  path: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
  method: "POST",
  request: ConfirmEmailChangeRequestSchema,
  response: z.union([
    ConfirmEmailChangeActionDataSuccessSchema,
    ConfirmEmailChangeActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<ConfirmEmailChangeRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path,
    };
  },
} as const;
