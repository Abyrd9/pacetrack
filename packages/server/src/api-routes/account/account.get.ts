import {
	ACCOUNT_GET_ROUTE_PATH,
	account_table,
	makeAccountGetRouteResponse,
	tenant_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function accountGetRoute(app: App) {
	app.get(ACCOUNT_GET_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			const response = await db
				.select({ account: account_table })
				.from(users_to_tenants_table)
				.innerJoin(
					tenant_table,
					eq(users_to_tenants_table.tenant_id, tenant_table.id),
				)
				.innerJoin(account_table, eq(tenant_table.account_id, account_table.id))
				.where(eq(users_to_tenants_table.user_id, userId));

			// Deduplicate accounts by ID in case the user is linked through multiple tenants
			const accounts = Array.from(
				new Map(response.map((r) => [r.account.id, r.account])).values(),
			);

			return c.json(
				makeAccountGetRouteResponse({
					key: ACCOUNT_GET_ROUTE_PATH,
					status: "ok",
					payload: { accounts },
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeAccountGetRouteResponse({
					key: ACCOUNT_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
