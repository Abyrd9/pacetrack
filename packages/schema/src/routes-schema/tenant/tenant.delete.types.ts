import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TENANT_DELETE_ROUTE_PATH = "/api/tenant/delete";

export const TenantDeleteRequestSchema = z.object({
	tenantId: z.string(),
});

export const TenantDeleteActionDataErrorSchema = ActionDataSchema(
	TenantDeleteRequestSchema,
	"error",
	TENANT_DELETE_ROUTE_PATH,
);

export const TenantDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	TENANT_DELETE_ROUTE_PATH,
);

export type TenantDeleteRouteResponse = RouteResponse<
	typeof TenantDeleteActionDataSuccessSchema,
	typeof TenantDeleteActionDataErrorSchema
>;

export const makeTenantDeleteRouteResponse = (
	args: TenantDeleteRouteResponse,
) => args;
