import {
	USER_GROUP_GET_ROUTE_PATH,
	UserGroupGetRequestSchema,
	makeUserGroupGetRouteResponse,
	tenant_table,
	user_group_table,
	users_to_user_groups_table,
	type UserGroup,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userGroupGetRoute(app: App) {
	app.post(USER_GROUP_GET_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, UserGroupGetRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserGroupGetRouteResponse({
						key: USER_GROUP_GET_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { scope = "user", page, perPage } = parsed.data;

			// Fetch rows based on scope
			let userGroups: UserGroup[] = [];
			let total = 0;

			if (scope === "user") {
				// total
				const totalResp = await db
					.select({ value: sql<number>`count(*)::int` })
					.from(user_group_table)
					.innerJoin(
						users_to_user_groups_table,
						eq(users_to_user_groups_table.user_group_id, user_group_table.id),
					)
					.where(
						and(
							eq(users_to_user_groups_table.user_id, userId),
							isNull(user_group_table.deleted_at),
						),
					);
				total = totalResp[0]?.value ?? 0;

				// paginated
				const baseQueryUser = db
					.select({ userGroup: user_group_table })
					.from(user_group_table)
					.innerJoin(
						users_to_user_groups_table,
						eq(users_to_user_groups_table.user_group_id, user_group_table.id),
					)
					.where(
						and(
							eq(users_to_user_groups_table.user_id, userId),
							isNull(user_group_table.deleted_at),
						),
					);

				const rows =
					page && perPage
						? await baseQueryUser.limit(perPage).offset((page - 1) * perPage)
						: await baseQueryUser;
				userGroups = rows.map((r) => r.userGroup);
			} else {
				const tenant = await db.query.tenant_table.findFirst({
					where: eq(tenant_table.id, tenantId),
				});

				if (!tenant) {
					return c.json(
						makeUserGroupGetRouteResponse({
							key: USER_GROUP_GET_ROUTE_PATH,
							status: "error",
							errors: { global: "Tenant not found" },
						}),
						400,
					);
				}

				const totalResp = await db
					.select({ value: sql<number>`count(*)::int` })
					.from(user_group_table)
					.where(
						and(
							eq(user_group_table.tenant_id, tenant.id),
							isNull(user_group_table.deleted_at),
						),
					);

				total = totalResp[0]?.value ?? 0;

				const baseQueryTenant = db
					.select({ userGroup: user_group_table })
					.from(user_group_table)
					.where(
						and(
							eq(user_group_table.tenant_id, tenant.id),
							isNull(user_group_table.deleted_at),
						),
					);

				const rows =
					page && perPage
						? await baseQueryTenant.limit(perPage).offset((page - 1) * perPage)
						: await baseQueryTenant;
				userGroups = rows.map((r) => r.userGroup);
			}

			let paginationMeta:
				| {
						total: number;
						page: number;
						perPage: number;
						totalPages: number;
				  }
				| undefined = undefined;

			if (page && perPage) {
				const totalPages = Math.ceil(total / perPage);
				paginationMeta = { total, page, perPage, totalPages };
			}

			return c.json(
				makeUserGroupGetRouteResponse({
					key: USER_GROUP_GET_ROUTE_PATH,
					status: "ok",
					payload: {
						userGroups,
						...(paginationMeta ? { pagination: paginationMeta } : {}),
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeUserGroupGetRouteResponse({
					key: USER_GROUP_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
