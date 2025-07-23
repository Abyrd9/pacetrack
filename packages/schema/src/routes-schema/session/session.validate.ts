import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { SessionSchema } from "../../types/session";

export const VALIDATE_SESSION_ROUTE_PATH = "/api/session/validate";

export const ValidateSessionRequestSchema = z.object({
	tenantId: z.string().optional(),
});

export const ValidateSessionSuccessSchema = ActionDataSchema(
	z.object({
		user_id: z.string(),
		tenant_id: z.string(),
		role_id: z.string(),
		session: SessionSchema,
	}),
	"ok",
	VALIDATE_SESSION_ROUTE_PATH,
);

export const ValidateSessionErrorSchema = ActionDataSchema(
	z.object({
		user_id: z.string().optional(),
		tenant_id: z.string().optional(),
		role_id: z.string().optional(),
	}),
	"error",
	VALIDATE_SESSION_ROUTE_PATH,
);

export type ValidateSessionRouteResponse = RouteResponse<
	typeof ValidateSessionSuccessSchema,
	typeof ValidateSessionErrorSchema
>;

export const makeValidateSessionRouteResponse = (
	args: ValidateSessionRouteResponse,
) => args;
