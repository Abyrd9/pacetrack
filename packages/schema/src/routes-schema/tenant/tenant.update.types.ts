import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const TenantUpdateRequestSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }).optional(),
	image: z
		.union([
			z
				.file()
				.max(1024 * 1024 * 25, {
					message: "Image must be less than 25MB",
				})
				.mime(["image/png", "image/webp", "image/jpeg"]),
			z.literal("REMOVE"),
		])
		.optional(),
});

export const TENANT_UPDATE_ROUTE_PATH = "/api/tenant/update";

export const TenantUpdateActionDataErrorSchema = ActionDataSchema(
	TenantUpdateRequestSchema,
	"error",
	TENANT_UPDATE_ROUTE_PATH,
);
export const TenantUpdateActionDataSuccessSchema = ActionDataSchema(
	TenantSchema,
	"ok",
	TENANT_UPDATE_ROUTE_PATH,
);

export type TenantUpdateRouteResponse = RouteResponse<
	typeof TenantUpdateActionDataSuccessSchema,
	typeof TenantUpdateActionDataErrorSchema
>;

export const makeTenantUpdateRouteResponse = (
	args: TenantUpdateRouteResponse,
) => args;
