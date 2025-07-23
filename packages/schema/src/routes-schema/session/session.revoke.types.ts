import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const SESSION_REVOKE_ROUTE_PATH = "/api/session/revoke";

export const SessionRevokeRequestSchema = z.object({
  sessionId: z.string(),
});

export const SessionRevokeActionDataErrorSchema = ActionDataSchema(
  SessionRevokeRequestSchema,
  "error",
  SESSION_REVOKE_ROUTE_PATH
);

export const SessionRevokeActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_REVOKE_ROUTE_PATH
);

export type SessionRevokeRouteResponse = RouteResponse<
  typeof SessionRevokeActionDataSuccessSchema,
  typeof SessionRevokeActionDataErrorSchema
>;

export const makeSessionRevokeRouteResponse = (
  args: SessionRevokeRouteResponse
) => args;
