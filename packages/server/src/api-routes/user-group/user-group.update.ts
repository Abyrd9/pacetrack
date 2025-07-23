import {
	USER_GROUP_UPDATE_ROUTE_PATH,
	UserGroupUpdateRequestSchema,
	hasPermission,
	makeUserGroupUpdateRouteResponse,
	role_table,
	user_group_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupUpdateRoute(app: App) {
	app.post(USER_GROUP_UPDATE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserGroupUpdateRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupUpdateRouteResponse({
						key: USER_GROUP_UPDATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, description, image_url } = parsed.data;

			// Get the user group to find its tenant
			const existing = await db
				.select()
				.from(user_group_table)
				.where(eq(user_group_table.id, id))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					makeUserGroupUpdateRouteResponse({
						key: USER_GROUP_UPDATE_ROUTE_PATH,
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
					makeUserGroupUpdateRouteResponse({
						key: USER_GROUP_UPDATE_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to update this user group",
						},
					}),
					403,
				);
			}

			const updated = await db
				.update(user_group_table)
				.set({ name, description, image_url })
				.where(eq(user_group_table.id, id))
				.returning();

			return c.json(
				makeUserGroupUpdateRouteResponse({
					key: USER_GROUP_UPDATE_ROUTE_PATH,
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupUpdateRouteResponse({
					key: USER_GROUP_UPDATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
