import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_SWITCH_ACCOUNT_ROUTE_PATH = "/api/session/switch-account";

const SessionSwitchAccountRequestSchema = z.object({
  account_id: z.string({ error: "Account ID is required" }).min(1, {
    message: "Account ID is required",
  }),
});

const SessionSwitchAccountActionDataErrorSchema = ActionDataSchema(
  SessionSwitchAccountRequestSchema,
  "error",
  SESSION_SWITCH_ACCOUNT_ROUTE_PATH
);

const SessionSwitchAccountActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_SWITCH_ACCOUNT_ROUTE_PATH
);

export type SessionSwitchAccountRouteResponse = RouteResponse<
  typeof SessionSwitchAccountActionDataSuccessSchema,
  typeof SessionSwitchAccountActionDataErrorSchema
>;

export const SESSION_SWITCH_ACCOUNT_ROUTE = {
  path: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
  method: "POST",
  request: SessionSwitchAccountRequestSchema,
  response: z.union([
    SessionSwitchAccountActionDataSuccessSchema,
    SessionSwitchAccountActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionSwitchAccountRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_SWITCH_ACCOUNT_ROUTE.path,
    };
  },
} as const;
