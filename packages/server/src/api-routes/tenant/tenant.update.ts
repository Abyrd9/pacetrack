import {
	ActionDataSchema,
	TENANT_UPDATE_ROUTE_PATH,
	TenantSchema,
	hasPermission,
	makeTenantUpdateRouteResponse,
	role_table,
	tenant_table,
	users_to_tenants_table,
	type RouteResponse,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { z } from "zod/v4";

export const TenantUpdateFormSchema = TenantSchema.pick({
	id: true,
	name: true,
	image_url: true,
}).extend({
	id: z.string(),
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	image_url: z.url().optional(),
});

const ActionDataErrorSchema = ActionDataSchema(
	TenantUpdateFormSchema,
	"error",
	TENANT_UPDATE_ROUTE_PATH,
);
const ActionDataSuccessSchema = ActionDataSchema(
	TenantSchema,
	"ok",
	TENANT_UPDATE_ROUTE_PATH,
);

export type TenantUpdateRouteResponse = RouteResponse<
	typeof ActionDataSuccessSchema,
	typeof ActionDataErrorSchema
>;

export function tenantUpdateRoute(app: App) {
	app.post(TENANT_UPDATE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, TenantUpdateFormSchema);

			if (!parsed.success) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, image_url } = parsed.data;

			const roles = await db
				.select({
					userTenant: users_to_tenants_table,
					role: role_table,
				})
				.from(users_to_tenants_table)
				.leftJoin(role_table, eq(role_table.id, users_to_tenants_table.role_id))
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, id),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to update this tenant" },
					}),
					403,
				);
			}

			const tenant = await db
				.update(tenant_table)
				.set({ name, image_url })
				.where(eq(tenant_table.id, id))
				.returning();

			if (tenant.length === 0) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					400,
				);
			}

			return c.json(
				makeTenantUpdateRouteResponse({
					key: TENANT_UPDATE_ROUTE_PATH,
					status: "ok",
					payload: tenant[0],
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeTenantUpdateRouteResponse({
					key: TENANT_UPDATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
