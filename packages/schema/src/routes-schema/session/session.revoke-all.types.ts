import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const SESSION_REVOKE_ALL_ROUTE_PATH = "/api/session/revoke-all";

export const SessionRevokeAllActionDataErrorSchema = ActionDataSchema(
  z.object({ global: z.string() }),
  "error",
  SESSION_REVOKE_ALL_ROUTE_PATH
);

export const SessionRevokeAllActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  SESSION_REVOKE_ALL_ROUTE_PATH
);

export type SessionRevokeAllRouteResponse = RouteResponse<
  typeof SessionRevokeAllActionDataSuccessSchema,
  typeof SessionRevokeAllActionDataErrorSchema
>;

export const makeSessionRevokeAllRouteResponse = (
  args: SessionRevokeAllRouteResponse
) => args;
