import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const SESSION_SWITCH_ACCOUNT_ROUTE_PATH = "/api/session/switch-account";

export const SessionSwitchAccountRequestSchema = z.object({
	account_id: z.string({ error: "Account ID is required" }).min(1, {
		message: "Account ID is required",
	}),
});

export const SessionSwitchAccountActionDataErrorSchema = ActionDataSchema(
	SessionSwitchAccountRequestSchema,
	"error",
	SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
);

export const SessionSwitchAccountActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
);

export type SessionSwitchAccountRouteResponse = RouteResponse<
	typeof SessionSwitchAccountActionDataSuccessSchema,
	typeof SessionSwitchAccountActionDataErrorSchema
>;

export const makeSessionSwitchAccountRouteResponse = (
	args: SessionSwitchAccountRouteResponse,
) => args;
