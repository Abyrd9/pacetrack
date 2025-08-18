import {
	account_to_tenant_table,
	MEMBERSHIP_GET_ROUTE_PATH,
	makeMembershipGetRouteResponse,
	membership_table,
	tenant_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function membershipGetRoute(app: App) {
	app.get(MEMBERSHIP_GET_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");

			const response = await db
				.select({ membership: membership_table })
				.from(account_to_tenant_table)
				.innerJoin(
					tenant_table,
					eq(account_to_tenant_table.tenant_id, tenant_table.id),
				)
				.innerJoin(
					membership_table,
					eq(tenant_table.membership_id, membership_table.id),
				)
				.where(eq(account_to_tenant_table.account_id, accountId));

			// Deduplicate memberships by ID in case the user is linked through multiple tenants
			const memberships = Array.from(
				new Map(response.map((r) => [r.membership.id, r.membership])).values(),
			);

			return c.json(
				makeMembershipGetRouteResponse({
					key: MEMBERSHIP_GET_ROUTE_PATH,
					status: "ok",
					payload: { memberships },
				}),
				200,
			);
		} catch (_error) {
			return c.json(
				makeMembershipGetRouteResponse({
					key: MEMBERSHIP_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
