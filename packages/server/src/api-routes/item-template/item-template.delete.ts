import {
	account_metadata_table,
	hasPermission,
	ITEM_TEMPLATE_DELETE_ROUTE,
	item_template_table,
	role_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function itemTemplateDeleteRoute(app: App) {
	app.post(ITEM_TEMPLATE_DELETE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				ITEM_TEMPLATE_DELETE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get item template with its pipeline template to verify tenant
			const existing = await db.query.item_template_table.findFirst({
				where: and(
					eq(item_template_table.id, id),
					isNull(item_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!existing) {
				return c.json(
					ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Item template not found" },
					}),
					404,
				);
			}

			// Verify item template belongs to current tenant
			if (existing.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Item template not found" },
					}),
					404,
				);
			}

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
			if (!role || !hasPermission(role, "manage_templates")) {
				return c.json(
					ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to delete this item template",
						},
					}),
					403,
				);
			}

			// Soft delete
			const deleted = await db
				.update(item_template_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(eq(item_template_table.id, id))
				.returning();

			return c.json(
				ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "ok",
					payload: deleted[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ITEM_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
