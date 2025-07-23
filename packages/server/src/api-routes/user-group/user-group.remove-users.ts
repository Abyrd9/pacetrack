import {
	USER_GROUP_REMOVE_USERS_ROUTE_PATH,
	UserGroupRemoveUsersRequestSchema,
	hasPermission,
	makeUserGroupRemoveUsersRouteResponse,
	role_table,
	user_group_table,
	users_to_tenants_table,
	users_to_user_groups_table,
} from "@pacetrack/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupRemoveUsersRoute(app: App) {
	app.post(USER_GROUP_REMOVE_USERS_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(
				c.req,
				UserGroupRemoveUsersRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeUserGroupRemoveUsersRouteResponse({
						key: USER_GROUP_REMOVE_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			const { userGroupId, userIds } = parsed.data;

			const userGroup = await db
				.select()
				.from(user_group_table)
				.where(eq(user_group_table.id, userGroupId))
				.limit(1);

			if (userGroup.length === 0) {
				return c.json(
					makeUserGroupRemoveUsersRouteResponse({
						key: USER_GROUP_REMOVE_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "User group not found" },
					}),
					400,
				);
			}

			const tenantId = userGroup[0].tenant_id;

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
			if (!role || !hasPermission(role, "manage_users")) {
				return c.json(
					makeUserGroupRemoveUsersRouteResponse({
						key: USER_GROUP_REMOVE_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to remove users" },
					}),
					403,
				);
			}

			await db
				.delete(users_to_user_groups_table)
				.where(
					and(
						eq(users_to_user_groups_table.user_group_id, userGroupId),
						inArray(users_to_user_groups_table.user_id, userIds),
					),
				);

			return c.json(
				makeUserGroupRemoveUsersRouteResponse({
					key: USER_GROUP_REMOVE_USERS_ROUTE_PATH,
					status: "ok",
					payload: { message: "Users removed" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupRemoveUsersRouteResponse({
					key: USER_GROUP_REMOVE_USERS_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
