import {
	USER_QUERY_ROUTE_PATH,
	UserQueryRequestSchema,
	makeUserQueryRouteResponse,
	user_table,
	users_to_tenants_table,
	type User,
} from "@pacetrack/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userQueryRoute(app: App) {
	app.post(USER_QUERY_ROUTE_PATH, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, UserQueryRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeUserQueryRouteResponse({
						key: USER_QUERY_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { term, page, perPage } = parsed.data;

			// total count
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
						or(
							ilike(user_table.email, `%${term}%`),
							ilike(user_table.display_name, `%${term}%`),
						),
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
						or(
							ilike(user_table.email, `%${term}%`),
							ilike(user_table.display_name, `%${term}%`),
						),
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
				makeUserQueryRouteResponse({
					key: USER_QUERY_ROUTE_PATH,
					status: "ok",
					payload: { users, ...(pagination ? { pagination } : {}) },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserQueryRouteResponse({
					key: USER_QUERY_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
