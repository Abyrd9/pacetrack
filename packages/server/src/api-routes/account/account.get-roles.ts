import {
	ACCOUNT_GET_ROLES_ROUTE_PATH,
	account_to_tenant_table,
	makeAccountGetRolesRouteResponse,
	type Role,
	role_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function accountGetRolesRoute(app: App) {
	app.post(ACCOUNT_GET_ROLES_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			if (!accountId) {
				return c.json(
					makeAccountGetRolesRouteResponse({
						key: ACCOUNT_GET_ROLES_ROUTE_PATH,
						status: "error",
						errors: { global: "Unauthorized" },
					}),
					401,
				);
			}

			// Get all account-tenant relationships with roles
			const accountRoles = await db
				.select({
					tenant_id: account_to_tenant_table.tenant_id,
					role: role_table,
				})
				.from(account_to_tenant_table)
				.innerJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(
					and(
						eq(account_to_tenant_table.account_id, accountId),
						isNull(account_to_tenant_table.deleted_at),
						isNull(role_table.deleted_at),
					),
				);

			// Transform into a map of tenant_id -> role (single role per tenant)
			const rolesMap: Record<string, Role> = {};
			accountRoles.forEach(({ tenant_id, role }) => {
				rolesMap[tenant_id] = role;
			});

			return c.json(
				makeAccountGetRolesRouteResponse({
					key: ACCOUNT_GET_ROLES_ROUTE_PATH,
					status: "ok",
					payload: { roles: rolesMap },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGetRolesRouteResponse({
					key: ACCOUNT_GET_ROLES_ROUTE_PATH,
					status: "error",
					errors: {
						global: "Something went wrong",
					},
				}),
				500,
			);
		}
	});
}
