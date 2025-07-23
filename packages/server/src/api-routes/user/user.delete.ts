import {
	USER_DELETE_ROUTE_PATH,
	UserDeleteRequestSchema,
	hasPermission,
	makeUserDeleteRouteResponse,
	role_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userDeleteRoute(app: App) {
	app.post(USER_DELETE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, UserDeleteRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeUserDeleteRouteResponse({
						key: USER_DELETE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			// Cannot delete yourself
			if (userId === parsed.data.userId) {
				return c.json(
					makeUserDeleteRouteResponse({
						key: USER_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "You cannot delete yourself" },
					}),
					400,
				);
			}

			// Check permission of current user
			const roleResp = await db
				.select({ role: role_table })
				.from(users_to_tenants_table)
				.innerJoin(
					role_table,
					eq(role_table.id, users_to_tenants_table.role_id),
				)
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, tenantId),
					),
				);

			const role = roleResp[0]?.role;
			if (!role || !hasPermission(role, "manage_users")) {
				return c.json(
					makeUserDeleteRouteResponse({
						key: USER_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			// Ensure target user belongs to tenant
			const userTenant = await db
				.select()
				.from(users_to_tenants_table)
				.where(
					and(
						eq(users_to_tenants_table.user_id, parsed.data.userId),
						eq(users_to_tenants_table.tenant_id, tenantId),
					),
				)
				.limit(1);

			if (userTenant.length === 0) {
				return c.json(
					makeUserDeleteRouteResponse({
						key: USER_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "User not found in tenant" },
					}),
					400,
				);
			}

			await db
				.update(user_table)
				.set({ deleted_at: sql`now()` })
				.where(eq(user_table.id, parsed.data.userId));

			return c.json(
				makeUserDeleteRouteResponse({
					key: USER_DELETE_ROUTE_PATH,
					status: "ok",
					payload: { message: "User deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserDeleteRouteResponse({
					key: USER_DELETE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
