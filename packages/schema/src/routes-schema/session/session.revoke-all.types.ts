import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_REVOKE_ALL_ROUTE_PATH = "/api/session/revoke-all";

const SessionRevokeAllActionDataErrorSchema = ActionDataSchema(
  z.object({ global: z.string() }),
  "error",
  SESSION_REVOKE_ALL_ROUTE_PATH
);

const SessionRevokeAllActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_REVOKE_ALL_ROUTE_PATH
);

export type SessionRevokeAllRouteResponse = RouteResponse<
  typeof SessionRevokeAllActionDataSuccessSchema,
  typeof SessionRevokeAllActionDataErrorSchema
>;

export const SESSION_REVOKE_ALL_ROUTE = {
  path: SESSION_REVOKE_ALL_ROUTE_PATH,
  method: "POST",
  response: z.union([
    SessionRevokeAllActionDataSuccessSchema,
    SessionRevokeAllActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SessionRevokeAllRouteResponse, "key">) => {
    return {
      ...args,
      key: SESSION_REVOKE_ALL_ROUTE.path,
    };
  },
} as const;
