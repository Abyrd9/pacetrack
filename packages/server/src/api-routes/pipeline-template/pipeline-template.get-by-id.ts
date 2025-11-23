import {
	item_template_table,
	PIPELINE_TEMPLATE_GET_BY_ID_ROUTE,
	pipeline_template_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineTemplateGetByIdRoute(app: App) {
	app.post(PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get pipeline template with step templates
			const template = await db.query.pipeline_template_table.findFirst({
				where: and(
					eq(pipeline_template_table.id, id),
					eq(pipeline_template_table.tenant_id, tenantId),
					isNull(pipeline_template_table.deleted_at),
				),
			});

			if (!template) {
				return c.json(
					PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Pipeline template not found",
						},
					}),
					404,
				);
			}

			// Get step templates for this pipeline template
			const stepTemplates = await db.query.step_template_table.findMany({
				where: and(
					eq(step_template_table.pipeline_template_id, id),
					isNull(step_template_table.deleted_at),
				),
				orderBy: [asc(step_template_table.order)],
			});

			// Get item template for this pipeline template
			const itemTemplate = await db.query.item_template_table.findFirst({
				where: and(
					eq(item_template_table.pipeline_template_id, id),
					isNull(item_template_table.deleted_at),
				),
			});

			if (!itemTemplate) {
				return c.json(
					PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Item template not found for this pipeline template",
						},
					}),
					404,
				);
			}

			return c.json(
				PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "ok",
					payload: {
						...template,
						step_templates: stepTemplates,
						item_template: itemTemplate,
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
