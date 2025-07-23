import {
	TENANT_GET_ROUTE_PATH,
	makeTenantGetRouteResponse,
	tenant_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function tenantGetRoute(app: App) {
	app.get(TENANT_GET_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			const response = await db
				.select({ tenant: tenant_table })
				.from(tenant_table)
				.innerJoin(
					users_to_tenants_table,
					eq(users_to_tenants_table.tenant_id, tenant_table.id),
				)
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						isNull(tenant_table.deleted_at),
					),
				);

			const tenants = response.map((r) => r.tenant);

			return c.json(
				makeTenantGetRouteResponse({
					key: TENANT_GET_ROUTE_PATH,
					status: "ok",
					payload: {
						tenants,
					},
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeTenantGetRouteResponse({
					key: TENANT_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
