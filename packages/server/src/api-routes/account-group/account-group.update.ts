import {
	ACCOUNT_GROUP_UPDATE_ROUTE,
	account_group_table,
	account_metadata_table,
	hasPermission,
	role_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { wouldCreateCycle } from "src/utils/helpers/account-group/check-hierarchy-cycle";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupUpdateRoute(app: App) {
	app.post(ACCOUNT_GROUP_UPDATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(
				c.req,
				ACCOUNT_GROUP_UPDATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, description, image_url, parent_group_id } = parsed.data;

			// Get the account group to find its tenant
			const existing = await db
				.select()
				.from(account_group_table)
				.where(eq(account_group_table.id, id))
				.limit(1);

			if (existing.length === 0) {
				return c.json(
					ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Account group not found" },
					}),
					400,
				);
			}

			const tenantId = existing[0].tenant_id;

			// Check permission
			const roles = await db
				.select({ accountTenant: account_metadata_table, role: role_table })
				.from(account_metadata_table)
				.leftJoin(role_table, eq(role_table.id, account_metadata_table.role_id))
				.where(
					and(
						eq(account_metadata_table.account_id, accountId),
						eq(account_metadata_table.tenant_id, tenantId),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to update this account group",
						},
					}),
					403,
				);
			}

			// If parent_group_id is being changed, validate it
			if (parent_group_id !== undefined) {
				// If parent_group_id is provided, verify it exists and belongs to same tenant
				if (parent_group_id) {
					const parentGroup = await db.query.account_group_table.findFirst({
						where: and(
							eq(account_group_table.id, parent_group_id),
							eq(account_group_table.tenant_id, tenantId),
						),
					});

					if (!parentGroup) {
						return c.json(
							ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
								status: "error",
								errors: {
									global:
										"Parent group not found or does not belong to this tenant",
								},
							}),
							400,
						);
					}

					// Check for cycles
					const cycleDetected = await wouldCreateCycle(id, parent_group_id);
					if (cycleDetected) {
						return c.json(
							ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
								status: "error",
								errors: {
									global:
										"Cannot move group: would create a circular hierarchy",
								},
							}),
							400,
						);
					}
				}
			}

			const updated = await db
				.update(account_group_table)
				.set({
					name,
					description,
					image_url,
					...(parent_group_id !== undefined && { parent_group_id }),
				})
				.where(eq(account_group_table.id, id))
				.returning();

			return c.json(
				ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ACCOUNT_GROUP_UPDATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
