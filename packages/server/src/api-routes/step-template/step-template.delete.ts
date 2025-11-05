import {
	account_metadata_table,
	hasPermission,
	role_table,
	STEP_TEMPLATE_DELETE_ROUTE,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function stepTemplateDeleteRoute(app: App) {
	app.post(STEP_TEMPLATE_DELETE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				STEP_TEMPLATE_DELETE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get step template with its pipeline template to verify tenant
			const existing = await db.query.step_template_table.findFirst({
				where: and(
					eq(step_template_table.id, id),
					isNull(step_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!existing) {
				return c.json(
					STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Step template not found" },
					}),
					404,
				);
			}

			// Verify step template belongs to current tenant
			if (existing.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Step template not found" },
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
					STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to delete this step template",
						},
					}),
					403,
				);
			}

			// Soft delete
			await db
				.update(step_template_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(eq(step_template_table.id, id));

			return c.json(
				STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "ok",
					payload: { message: "Step template deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				STEP_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
