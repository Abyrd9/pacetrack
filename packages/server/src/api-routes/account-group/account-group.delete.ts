import {
	ACCOUNT_GROUP_DELETE_ROUTE_PATH,
	AccountGroupDeleteRequestSchema,
	account_group_table,
	account_to_tenant_table,
	hasPermission,
	makeAccountGroupDeleteRouteResponse,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupDeleteRoute(app: App) {
	app.post(ACCOUNT_GROUP_DELETE_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(
				c.req,
				AccountGroupDeleteRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeAccountGroupDeleteRouteResponse({
						key: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { accountGroupId } = parsed.data;

			// Get account group
			const existing = await db
				.select()
				.from(account_group_table)
				.where(eq(account_group_table.id, accountGroupId))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					makeAccountGroupDeleteRouteResponse({
						key: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "Account group not found" },
					}),
					400,
				);
			}

			const tenantId = existing[0].tenant_id;

			// Check permission
			const roles = await db
				.select({ accountTenant: account_to_tenant_table, role: role_table })
				.from(account_to_tenant_table)
				.leftJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(
					and(
						eq(account_to_tenant_table.account_id, accountId),
						eq(account_to_tenant_table.tenant_id, tenantId),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					makeAccountGroupDeleteRouteResponse({
						key: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to delete this account group",
						},
					}),
					403,
				);
			}

			await db
				.update(account_group_table)
				.set({ deleted_at: sql`now()` })
				.where(eq(account_group_table.id, accountGroupId));

			return c.json(
				makeAccountGroupDeleteRouteResponse({
					key: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
					status: "ok",
					payload: { message: "Account group deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGroupDeleteRouteResponse({
					key: ACCOUNT_GROUP_DELETE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
