import {
	PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE,
	pipeline_instance_table,
	pipeline_template_table,
} from "@pacetrack/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineInstanceGetByTemplateIdRoute(app: App) {
	app.post(PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { pipeline_template_id, search, status } = parsed.data;

			// Verify pipeline template exists and belongs to tenant
			const template = await db.query.pipeline_template_table.findFirst({
				where: and(
					eq(pipeline_template_table.id, pipeline_template_id),
					eq(pipeline_template_table.tenant_id, tenantId),
					isNull(pipeline_template_table.deleted_at),
				),
			});

			if (!template) {
				return c.json(
					PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Pipeline template not found",
						},
					}),
					404,
				);
			}

			// Build query conditions
			const conditions = [
				eq(pipeline_instance_table.pipeline_template_id, pipeline_template_id),
				isNull(pipeline_instance_table.deleted_at),
			];

			// Add status filter if provided
			if (status) {
				conditions.push(eq(pipeline_instance_table.status, status));
			}

			// Add search filter if provided (search in name)
			if (search) {
				conditions.push(ilike(pipeline_instance_table.name, `%${search}%`));
			}

			// Get pipeline instances
			const instances = await db.query.pipeline_instance_table.findMany({
				where: and(...conditions),
				orderBy: (pipeline_instance_table, { desc }) => [
					desc(pipeline_instance_table.created_at),
				],
			});

			return c.json(
				PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.createRouteResponse({
					status: "ok",
					payload: instances,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
