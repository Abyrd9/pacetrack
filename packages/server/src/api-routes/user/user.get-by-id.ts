import {
	USER_GET_BY_ID_ROUTE_PATH,
	UserGetByIdRequestSchema,
	makeUserGetByIdRouteResponse,
	user_table,
	users_to_tenants_table,
	type User,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGetByIdRoute(app: App) {
	app.post(USER_GET_BY_ID_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, UserGetByIdRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeUserGetByIdRouteResponse({
						key: USER_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			// Ensure requested user belongs to tenant
			const userRow = await db
				.select({ user: user_table })
				.from(user_table)
				.innerJoin(
					users_to_tenants_table,
					eq(users_to_tenants_table.user_id, user_table.id),
				)
				.where(
					and(
						eq(user_table.id, parsed.data.userId),
						eq(users_to_tenants_table.tenant_id, tenantId),
					),
				)
				.limit(1);

			if (userRow.length === 0) {
				return c.json(
					makeUserGetByIdRouteResponse({
						key: USER_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "User not found" },
					}),
					400,
				);
			}

			const targetUser: User = userRow[0].user;

			if (targetUser.deleted_at) {
				return c.json(
					makeUserGetByIdRouteResponse({
						key: USER_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "User not found" },
					}),
					400,
				);
			}

			return c.json(
				makeUserGetByIdRouteResponse({
					key: USER_GET_BY_ID_ROUTE_PATH,
					status: "ok",
					payload: targetUser,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGetByIdRouteResponse({
					key: USER_GET_BY_ID_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
