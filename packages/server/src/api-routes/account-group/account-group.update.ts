import {
	ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
	AccountGroupUpdateRequestSchema,
	account_group_table,
	account_to_tenant_table,
	hasPermission,
	makeAccountGroupUpdateRouteResponse,
	role_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupUpdateRoute(app: App) {
	app.post(ACCOUNT_GROUP_UPDATE_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(
				c.req,
				AccountGroupUpdateRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeAccountGroupUpdateRouteResponse({
						key: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, description, image_url } = parsed.data;

			// Get the account group to find its tenant
			const existing = await db
				.select()
				.from(account_group_table)
				.where(eq(account_group_table.id, id))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					makeAccountGroupUpdateRouteResponse({
						key: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
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
					makeAccountGroupUpdateRouteResponse({
						key: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to update this account group",
						},
					}),
					403,
				);
			}

			const updated = await db
				.update(account_group_table)
				.set({ name, description, image_url })
				.where(eq(account_group_table.id, id))
				.returning();

			return c.json(
				makeAccountGroupUpdateRouteResponse({
					key: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGroupUpdateRouteResponse({
					key: ACCOUNT_GROUP_UPDATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
