import {
	USER_GROUP_ADD_USERS_ROUTE_PATH,
	UserGroupAddUsersRequestSchema,
	hasPermission,
	makeUserGroupAddUsersRouteResponse,
	role_table,
	user_group_table,
	users_to_tenants_table,
	users_to_user_groups_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupAddUsersRoute(app: App) {
	app.post(USER_GROUP_ADD_USERS_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserGroupAddUsersRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupAddUsersRouteResponse({
						key: USER_GROUP_ADD_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			const { userGroupId, userIds } = parsed.data;

			// Fetch the user group to get tenant
			const userGroup = await db
				.select()
				.from(user_group_table)
				.where(eq(user_group_table.id, userGroupId))
				.limit(1);

			if (userGroup.length === 0) {
				return c.json(
					makeUserGroupAddUsersRouteResponse({
						key: USER_GROUP_ADD_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "User group not found" },
					}),
					400,
				);
			}
			const tenantId = userGroup[0].tenant_id;

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
			if (!role || !hasPermission(role, "manage_users")) {
				return c.json(
					makeUserGroupAddUsersRouteResponse({
						key: USER_GROUP_ADD_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to add users" },
					}),
					403,
				);
			}

			await db.transaction(async (tx) => {
				for (const uid of userIds) {
					const exists = await tx
						.select()
						.from(users_to_user_groups_table)
						.where(
							and(
								eq(users_to_user_groups_table.user_id, uid),
								eq(users_to_user_groups_table.user_group_id, userGroupId),
							),
						)
						.limit(1);

					if (exists.length === 0) {
						await tx.insert(users_to_user_groups_table).values({
							user_id: uid,
							user_group_id: userGroupId,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						});
					}
				}
			});

			return c.json(
				makeUserGroupAddUsersRouteResponse({
					key: USER_GROUP_ADD_USERS_ROUTE_PATH,
					status: "ok",
					payload: { message: "Users added" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupAddUsersRouteResponse({
					key: USER_GROUP_ADD_USERS_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
