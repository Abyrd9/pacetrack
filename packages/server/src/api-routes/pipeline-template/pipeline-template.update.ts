import {
	account_metadata_table,
	hasPermission,
	PIPELINE_TEMPLATE_UPDATE_ROUTE,
	pipeline_template_table,
	role_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineTemplateUpdateRoute(app: App) {
	app.post(PIPELINE_TEMPLATE_UPDATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_TEMPLATE_UPDATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							...parsed.errors,
							iconColor: parsed.errors.iconColor,
						},
					}),
					400,
				);
			}

			const { id, name, description, status, icon, iconColor } = parsed.data;

			// Get existing pipeline template
			const existing = await db.query.pipeline_template_table.findFirst({
				where: and(
					eq(pipeline_template_table.id, id),
					eq(pipeline_template_table.tenant_id, tenantId),
					isNull(pipeline_template_table.deleted_at),
				),
			});

			if (!existing) {
				return c.json(
					PIPELINE_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
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
					PIPELINE_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to update this pipeline template",
						},
					}),
					403,
				);
			}

			// Update pipeline template
			const updated = await db
				.update(pipeline_template_table)
				.set({
					...(name !== undefined && { name }),
					...(description !== undefined && { description }),
					...(status !== undefined && { status }),
					...(icon !== undefined && { icon }),
					...(iconColor !== undefined && { iconColor }),
					updated_at: sql`now()`,
				})
				.where(eq(pipeline_template_table.id, id))
				.returning();

			return c.json(
				PIPELINE_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
