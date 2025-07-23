import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const TENANT_DELETE_ROUTE_PATH = "/api/tenant/delete";

const TenantDeleteRequestSchema = z.object({
	tenant_id: z.string(),
	bypassNonCriticalBlockers: z
		.union([z.boolean(), z.string()])
		.transform((val) => val === true || val === "true")
		.optional()
		.default(false),
});

const TenantDeleteActionDataErrorSchema = ActionDataSchema(
	TenantDeleteRequestSchema,
	"error",
	TENANT_DELETE_ROUTE_PATH,
);

const TenantDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({ messages: z.string().array() }),
	"ok",
	TENANT_DELETE_ROUTE_PATH,
);

export type TenantDeleteRouteResponse = RouteResponse<
	typeof TenantDeleteActionDataSuccessSchema,
	typeof TenantDeleteActionDataErrorSchema
>;

export const TENANT_DELETE_ROUTE = {
	path: TENANT_DELETE_ROUTE_PATH,
	method: "POST",
	request: TenantDeleteRequestSchema,
	response: z.union([
		TenantDeleteActionDataSuccessSchema,
		TenantDeleteActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<TenantDeleteRouteResponse, "key">) => {
		return {
			...args,
			key: TENANT_DELETE_ROUTE.path,
		};
	},
} as const;
