import {
	account_metadata_table,
	hasPermission,
	PIPELINE_TEMPLATE_DELETE_ROUTE,
	pipeline_template_table,
	role_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineTemplateDeleteRoute(app: App) {
	app.post(PIPELINE_TEMPLATE_DELETE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_TEMPLATE_DELETE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get pipeline template
			const existing = await db.query.pipeline_template_table.findFirst({
				where: and(
					eq(pipeline_template_table.id, id),
					eq(pipeline_template_table.tenant_id, tenantId),
					isNull(pipeline_template_table.deleted_at),
				),
			});

			if (!existing) {
				return c.json(
					PIPELINE_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Pipeline template not found" },
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
					PIPELINE_TEMPLATE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to delete this pipeline template",
						},
					}),
					403,
				);
			}

			// Soft delete
			await db
				.update(pipeline_template_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(eq(pipeline_template_table.id, id));

			// Soft delete all step-templates associated with this pipeline template
			await db
				.update(step_template_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(
					and(
						eq(step_template_table.pipeline_template_id, id),
						isNull(step_template_table.deleted_at),
					),
				);

			return c.json(
				PIPELINE_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "ok",
					payload: { message: "Pipeline template deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_TEMPLATE_DELETE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
