import {
	USER_GET_ROUTE_PATH,
	UserGetRequestSchema,
	makeUserGetRouteResponse,
	user_table,
	users_to_tenants_table,
	type User,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGetRoute(app: App) {
	app.post(USER_GET_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, UserGetRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeUserGetRouteResponse({
						key: USER_GET_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { page, perPage } = parsed.data;

			// Permission check (view users) - we assume any tenant member can view users
			// If stricter, can use manage_users.

			// Count total
			const totalResp = await db
				.select({ value: sql<number>`count(*)::int` })
				.from(user_table)
				.innerJoin(
					users_to_tenants_table,
					eq(users_to_tenants_table.user_id, user_table.id),
				)
				.where(
					and(
						eq(users_to_tenants_table.tenant_id, tenantId),
						isNull(user_table.deleted_at),
					),
				);

			const total = totalResp[0]?.value ?? 0;

			const baseQuery = db
				.select({ user: user_table })
				.from(user_table)
				.innerJoin(
					users_to_tenants_table,
					eq(users_to_tenants_table.user_id, user_table.id),
				)
				.where(
					and(
						eq(users_to_tenants_table.tenant_id, tenantId),
						isNull(user_table.deleted_at),
					),
				);

			const rows: { user: User }[] =
				page && perPage
					? await baseQuery.limit(perPage).offset((page - 1) * perPage)
					: await baseQuery;

			const users = rows.map((r) => r.user);

			let pagination:
				| { total: number; page: number; perPage: number; totalPages: number }
				| undefined;
			if (page && perPage) {
				pagination = {
					total,
					page,
					perPage,
					totalPages: Math.ceil(total / perPage),
				};
			}

			return c.json(
				makeUserGetRouteResponse({
					key: USER_GET_ROUTE_PATH,
					status: "ok",
					payload: { users, ...(pagination ? { pagination } : {}) },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGetRouteResponse({
					key: USER_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
