import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_REMOVE_ACCOUNT_ROUTE_PATH = "/api/session/remove-account";

const SessionRemoveAccountRequestSchema = z.object({
  account_id: z.string(),
});

const SessionRemoveAccountActionDataErrorSchema = ActionDataSchema(
  SessionRemoveAccountRequestSchema,
  "error",
  SESSION_REMOVE_ACCOUNT_ROUTE_PATH
);

const SessionRemoveAccountActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  SESSION_REMOVE_ACCOUNT_ROUTE_PATH
);

export type SessionRemoveAccountRouteResponse = RouteResponse<
  typeof SessionRemoveAccountActionDataSuccessSchema,
  typeof SessionRemoveAccountActionDataErrorSchema
>;

export const SESSION_REMOVE_ACCOUNT_ROUTE = {
  path: SESSION_REMOVE_ACCOUNT_ROUTE_PATH,
  method: "POST",
  request: SessionRemoveAccountRequestSchema,
  response: z.union([
    SessionRemoveAccountActionDataSuccessSchema,
    SessionRemoveAccountActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionRemoveAccountRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_REMOVE_ACCOUNT_ROUTE.path,
    };
  },
} as const;
