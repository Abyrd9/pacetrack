import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_REVOKE_ROUTE_PATH = "/api/session/revoke";

const SessionRevokeRequestSchema = z.object({
  sessionId: z.string(),
});

const SessionRevokeActionDataErrorSchema = ActionDataSchema(
  SessionRevokeRequestSchema,
  "error",
  SESSION_REVOKE_ROUTE_PATH
);

const SessionRevokeActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_REVOKE_ROUTE_PATH
);

export type SessionRevokeRouteResponse = RouteResponse<
  typeof SessionRevokeActionDataSuccessSchema,
  typeof SessionRevokeActionDataErrorSchema
>;

export const SESSION_REVOKE_ROUTE = {
  path: SESSION_REVOKE_ROUTE_PATH,
  method: "POST",
  request: SessionRevokeRequestSchema,
  response: z.union([
    SessionRevokeActionDataSuccessSchema,
    SessionRevokeActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SessionRevokeRouteResponse, "key">) => {
    return {
      ...args,
      key: SESSION_REVOKE_ROUTE.path,
    };
  },
} as const;
