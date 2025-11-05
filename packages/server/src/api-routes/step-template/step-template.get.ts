import {
	STEP_TEMPLATE_GET_ROUTE,
	step_template_table,
} from "@pacetrack/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function stepTemplateGetRoute(app: App) {
	app.post(STEP_TEMPLATE_GET_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				STEP_TEMPLATE_GET_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					STEP_TEMPLATE_GET_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Invalid request parameters" },
					}),
					400,
				);
			}

			const { pipeline_template_id } = parsed.data;

			// Build query conditions
			const conditions = [isNull(step_template_table.deleted_at)];

			// Add pipeline template filter if provided
			if (pipeline_template_id) {
				conditions.push(
					eq(step_template_table.pipeline_template_id, pipeline_template_id),
				);
			}

			// Get step templates with their pipeline templates to verify tenant
			const stepTemplates = await db.query.step_template_table.findMany({
				where: and(...conditions),
				with: {
					pipeline_template: true,
				},
				orderBy: [asc(step_template_table.order)],
			});

			// Filter by tenant (through pipeline template)
			const tenantStepTemplates = stepTemplates.filter(
				(step) => step.pipeline_template.tenant_id === tenantId,
			);

			// Remove the nested pipeline_template from response
			const cleanSteps = tenantStepTemplates.map(
				({ pipeline_template, ...step }) => step,
			);

			return c.json(
				STEP_TEMPLATE_GET_ROUTE.createRouteResponse({
					status: "ok",
					payload: {
						steps: cleanSteps,
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				STEP_TEMPLATE_GET_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
