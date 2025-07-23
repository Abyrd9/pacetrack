import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const SESSION_SWITCH_TENANT_ROUTE_PATH = "/api/session/switch-tenant";

export const SessionSwitchTenantRequestSchema = z.object({
	tenant_id: z.string({ error: "Tenant ID is required" }).min(1, {
		message: "Tenant ID is required",
	}),
});

export const SessionSwitchTenantActionDataErrorSchema = ActionDataSchema(
	SessionSwitchTenantRequestSchema,
	"error",
	SESSION_SWITCH_TENANT_ROUTE_PATH,
);

export const SessionSwitchTenantActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	SESSION_SWITCH_TENANT_ROUTE_PATH,
);

export type SessionSwitchTenantRouteResponse = RouteResponse<
	typeof SessionSwitchTenantActionDataSuccessSchema,
	typeof SessionSwitchTenantActionDataErrorSchema
>;

export const makeSessionSwitchTenantRouteResponse = (
	args: SessionSwitchTenantRouteResponse,
) => args;
