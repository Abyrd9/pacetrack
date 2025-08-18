import {
	ACCOUNT_DELETE_ROUTE_PATH,
	AccountDeleteRequestSchema,
	account_table,
	account_to_tenant_table,
	hasPermission,
	makeAccountDeleteRouteResponse,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountDeleteRoute(app: App) {
	app.post(ACCOUNT_DELETE_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, AccountDeleteRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeAccountDeleteRouteResponse({
						key: ACCOUNT_DELETE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			// TODO: What do we do if we want to delete your own account on this tenant?
			if (accountId === parsed.data.accountId) {
				// 1. If it's the personal tenant, you can't delete yourself,
				//    at least not on this route, we'll have a route to permanently delete your user/account(s)
				// 2. If you have permissions to delete yourself off of this tenant:
				//    a. If you are the the only admin, you must call an eventual delete tenant route
				//    b. If you are not the only admin, but you are the admin that created membership,
				//       1. You must have other admin create a new membership
				//    c. If you are not the only admin and not the membership owner, you can delete yourself
				return c.json(
					makeAccountDeleteRouteResponse({
						key: ACCOUNT_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "You cannot delete your own account" },
					}),
					400,
				);
			}

			// Check permission of current account
			const roleResp = await db
				.select({ role: role_table })
				.from(account_to_tenant_table)
				.innerJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(
					and(
						eq(account_to_tenant_table.account_id, accountId),
						eq(account_to_tenant_table.tenant_id, tenantId),
					),
				);

			const role = roleResp[0]?.role;
			if (!role || !hasPermission(role, "manage_accounts")) {
				return c.json(
					makeAccountDeleteRouteResponse({
						key: ACCOUNT_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			// Ensure target account belongs to tenant
			const accountTenant = await db
				.select()
				.from(account_to_tenant_table)
				.where(
					and(
						eq(account_to_tenant_table.account_id, parsed.data.accountId),
						eq(account_to_tenant_table.tenant_id, tenantId),
					),
				)
				.limit(1);

			if (accountTenant.length === 0) {
				return c.json(
					makeAccountDeleteRouteResponse({
						key: ACCOUNT_DELETE_ROUTE_PATH,
						status: "error",
						errors: { global: "Account not found in tenant" },
					}),
					400,
				);
			}

			await db
				.update(account_table)
				.set({ deleted_at: sql`now()` })
				.where(eq(account_table.id, parsed.data.accountId));

			return c.json(
				makeAccountDeleteRouteResponse({
					key: ACCOUNT_DELETE_ROUTE_PATH,
					status: "ok",
					payload: { message: "Account deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountDeleteRouteResponse({
					key: ACCOUNT_DELETE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
