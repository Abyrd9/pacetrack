import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { SessionSchema } from "../../types/session";

export const SESSION_LIST_ROUTE_PATH = "/api/session/list";

export const SessionListActionDataErrorSchema = ActionDataSchema(
	z.object({ global: z.string() }),
	"error",
	SESSION_LIST_ROUTE_PATH,
);

export const SessionListActionDataSuccessSchema = ActionDataSchema(
	z.object({ sessions: z.array(SessionSchema) }),
	"ok",
	SESSION_LIST_ROUTE_PATH,
);

export type SessionListRouteResponse = RouteResponse<
	typeof SessionListActionDataSuccessSchema,
	typeof SessionListActionDataErrorSchema
>;

export const makeSessionListRouteResponse = (args: SessionListRouteResponse) =>
	args;
