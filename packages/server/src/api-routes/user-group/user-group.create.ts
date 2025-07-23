import {
	USER_GROUP_CREATE_ROUTE_PATH,
	UserGroupCreateRequestSchema,
	hasPermission,
	makeUserGroupCreateRouteResponse,
	role_table,
	user_group_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupCreateRoute(app: App) {
	app.post(USER_GROUP_CREATE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserGroupCreateRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupCreateRouteResponse({
						key: USER_GROUP_CREATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { name, description, image_url, tenant_id } = parsed.data;

			// Verify the current user has permission to create user groups in this tenant
			const roles = await db
				.select({ userTenant: users_to_tenants_table, role: role_table })
				.from(users_to_tenants_table)
				.leftJoin(role_table, eq(role_table.id, users_to_tenants_table.role_id))
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, tenant_id),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_roles")) {
				return c.json(
					makeUserGroupCreateRouteResponse({
						key: USER_GROUP_CREATE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to create user groups" },
					}),
					403,
				);
			}

			const userGroup = await db
				.insert(user_group_table)
				.values({
					name,
					description,
					image_url,
					tenant_id,
					created_at: sql`now()`,
					updated_at: sql`now()`,
				})
				.returning();

			return c.json(
				makeUserGroupCreateRouteResponse({
					key: USER_GROUP_CREATE_ROUTE_PATH,
					status: "ok",
					payload: userGroup[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupCreateRouteResponse({
					key: USER_GROUP_CREATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
