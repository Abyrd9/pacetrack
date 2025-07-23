import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { SessionSchema } from "../../types/session";

const SESSION_LIST_ROUTE_PATH = "/api/session/list";

const SessionListActionDataErrorSchema = ActionDataSchema(
  z.object({ global: z.string() }),
  "error",
  SESSION_LIST_ROUTE_PATH
);

const SessionListActionDataSuccessSchema = ActionDataSchema(
  z.object({ sessions: z.array(SessionSchema) }),
  "ok",
  SESSION_LIST_ROUTE_PATH
);

export type SessionListRouteResponse = RouteResponse<
  typeof SessionListActionDataSuccessSchema,
  typeof SessionListActionDataErrorSchema
>;

export const SESSION_LIST_ROUTE = {
  path: SESSION_LIST_ROUTE_PATH,
  method: "GET",
  response: z.union([
    SessionListActionDataSuccessSchema,
    SessionListActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SessionListRouteResponse, "key">) => {
    return {
      ...args,
      key: SESSION_LIST_ROUTE.path,
    };
  },
} as const;
