import {
	USER_GROUP_DELETE_ROUTE_PATH,
	UserGroupDeleteRequestSchema,
	hasPermission,
	makeUserGroupDeleteRouteResponse,
	role_table,
	user_group_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupDeleteRoute(app: App) {
	app.post(USER_GROUP_DELETE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserGroupDeleteRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupDeleteRouteResponse({
						key: USER_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { userGroupId } = parsed.data;

			// Get user group
			const existing = await db
				.select()
				.from(user_group_table)
				.where(eq(user_group_table.id, userGroupId))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					makeUserGroupDeleteRouteResponse({
						key: USER_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "User group not found" },
					}),
					400,
				);
			}

			const tenantId = existing[0].tenant_id;

			// Check permission
			const roles = await db
				.select({ userTenant: users_to_tenants_table, role: role_table })
				.from(users_to_tenants_table)
				.leftJoin(role_table, eq(role_table.id, users_to_tenants_table.role_id))
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, tenantId),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					makeUserGroupDeleteRouteResponse({
						key: USER_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to delete this user group",
						},
					}),
					403,
				);
			}

			await db
				.update(user_group_table)
				.set({ deleted_at: sql`now()` })
				.where(eq(user_group_table.id, userGroupId));

			return c.json(
				makeUserGroupDeleteRouteResponse({
					key: USER_GROUP_DELETE_ROUTE_PATH,
					status: "ok",
					payload: { message: "User group deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupDeleteRouteResponse({
					key: USER_GROUP_DELETE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
