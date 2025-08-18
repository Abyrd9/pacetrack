import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TenantCreateRequestSchema = z.object({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	membership_id: z.string().optional(), // Optional - if not provided, a new membership will be created
	image: z
		.file()
		.max(1024 * 1024 * 25, {
			message: "Image must be less than 25MB",
		})
		.mime(["image/png", "image/webp", "image/jpeg"])
		.optional(),
});

export const TENANT_CREATE_ROUTE_PATH = "/api/tenant/create";

export const TenantCreateActionDataErrorSchema = ActionDataSchema(
	TenantCreateRequestSchema,
	"error",
	TENANT_CREATE_ROUTE_PATH,
);
export const TenantCreateActionDataSuccessSchema = ActionDataSchema(
	TenantSchema,
	"ok",
	TENANT_CREATE_ROUTE_PATH,
);

export type TenantCreateRouteResponse = RouteResponse<
	typeof TenantCreateActionDataSuccessSchema,
	typeof TenantCreateActionDataErrorSchema
>;

export const makeTenantCreateRouteResponse = (
	args: TenantCreateRouteResponse,
) => args;
