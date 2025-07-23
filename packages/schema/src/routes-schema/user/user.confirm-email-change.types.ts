import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const CONFIRM_EMAIL_CHANGE_ROUTE_PATH = "/api/user/confirm-email-change";

export const ConfirmEmailChangeRequestSchema = z.object({
  email: z.email(),
  token: z.string().min(1),
});

export const ConfirmEmailChangeActionDataErrorSchema = ActionDataSchema(
  ConfirmEmailChangeRequestSchema,
  "error",
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH
);

export const ConfirmEmailChangeActionDataSuccessSchema = ActionDataSchema(
  ConfirmEmailChangeRequestSchema,
  "ok",
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH
);

export type ConfirmEmailChangeRouteResponse = RouteResponse<
  typeof ConfirmEmailChangeActionDataSuccessSchema,
  typeof ConfirmEmailChangeActionDataErrorSchema
>;

export const makeConfirmEmailChangeRouteResponse = (
  args: ConfirmEmailChangeRouteResponse
) => args; 