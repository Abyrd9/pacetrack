import {
	USER_GROUP_GET_BY_ID_ROUTE_PATH,
	UserGroupGetByIdRequestSchema,
	makeUserGroupGetByIdRouteResponse,
	user_group_table,
	users_to_user_groups_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupGetByIdRoute(app: App) {
	app.post(USER_GROUP_GET_BY_ID_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserGroupGetByIdRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupGetByIdRouteResponse({
						key: USER_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { userGroupId } = parsed.data;

			const userGroupResp = await db
				.select({ userGroup: user_group_table })
				.from(user_group_table)
				.innerJoin(
					users_to_user_groups_table,
					eq(users_to_user_groups_table.user_group_id, user_group_table.id),
				)
				.where(
					and(
						eq(user_group_table.id, userGroupId),
						eq(users_to_user_groups_table.user_id, userId),
						isNull(user_group_table.deleted_at),
					),
				);

			if (userGroupResp.length === 0) {
				return c.json(
					makeUserGroupGetByIdRouteResponse({
						key: USER_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "User group not found" },
					}),
					400,
				);
			}

			const targetUserGroup = userGroupResp[0].userGroup;

			if (targetUserGroup.deleted_at) {
				return c.json(
					makeUserGroupGetByIdRouteResponse({
						key: USER_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "User group not found" },
					}),
					400,
				);
			}

			return c.json(
				makeUserGroupGetByIdRouteResponse({
					key: USER_GROUP_GET_BY_ID_ROUTE_PATH,
					status: "ok",
					payload: userGroupResp[0].userGroup,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupGetByIdRouteResponse({
					key: USER_GROUP_GET_BY_ID_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
