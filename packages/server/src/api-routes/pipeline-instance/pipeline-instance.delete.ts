import {
	account_metadata_table,
	hasPermission,
	PIPELINE_INSTANCE_DELETE_ROUTE,
	pipeline_instance_table,
	role_table,
	step_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineInstanceDeleteRoute(app: App) {
	app.post(PIPELINE_INSTANCE_DELETE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_INSTANCE_DELETE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_INSTANCE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get pipeline instance
			const existing = await db.query.pipeline_instance_table.findFirst({
				where: and(
					eq(pipeline_instance_table.id, id),
					eq(pipeline_instance_table.tenant_id, tenantId),
					isNull(pipeline_instance_table.deleted_at),
				),
			});

			if (!existing) {
				return c.json(
					PIPELINE_INSTANCE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Pipeline instance not found" },
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
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					PIPELINE_INSTANCE_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to delete this pipeline instance",
						},
					}),
					403,
				);
			}

			// Soft delete
			await db
				.update(pipeline_instance_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(eq(pipeline_instance_table.id, id));

			// Soft delete all steps associated with this pipeline instance
			await db
				.update(step_table)
				.set({ deleted_at: sql`now()`, updated_at: sql`now()` })
				.where(
					and(
						eq(step_table.pipeline_instance_id, existing.id),
						isNull(step_table.deleted_at),
					),
				);

			return c.json(
				PIPELINE_INSTANCE_DELETE_ROUTE.createRouteResponse({
					status: "ok",
					payload: { message: "Pipeline instance deleted" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_INSTANCE_DELETE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
