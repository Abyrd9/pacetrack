import {
	STEP_TEMPLATE_GET_BY_ID_ROUTE,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function stepTemplateGetByIdRoute(app: App) {
	app.post(STEP_TEMPLATE_GET_BY_ID_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				STEP_TEMPLATE_GET_BY_ID_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					STEP_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get step template with its pipeline template to verify tenant
			const stepTemplate = await db.query.step_template_table.findFirst({
				where: and(
					eq(step_template_table.id, id),
					isNull(step_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!stepTemplate) {
				return c.json(
					STEP_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Step template not found",
						},
					}),
					404,
				);
			}

			// Verify step template belongs to current tenant
			if (stepTemplate.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					STEP_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Step template not found",
						},
					}),
					404,
				);
			}

			return c.json(
				STEP_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "ok",
					payload: stepTemplate,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				STEP_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
