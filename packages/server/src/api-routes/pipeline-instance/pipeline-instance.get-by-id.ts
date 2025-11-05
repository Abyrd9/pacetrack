import {
	PIPELINE_INSTANCE_GET_BY_ID_ROUTE,
	pipeline_instance_table,
	step_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineInstanceGetByIdRoute(app: App) {
	app.post(PIPELINE_INSTANCE_GET_BY_ID_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_INSTANCE_GET_BY_ID_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_INSTANCE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get pipeline instance with its pipeline template to verify tenant
			const instance = await db.query.pipeline_instance_table.findFirst({
				where: and(
					eq(pipeline_instance_table.id, id),
					isNull(pipeline_instance_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!instance) {
				return c.json(
					PIPELINE_INSTANCE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Pipeline instance not found",
						},
					}),
					404,
				);
			}

			// Verify instance belongs to current tenant
			if (instance.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					PIPELINE_INSTANCE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Pipeline instance not found",
						},
					}),
					404,
				);
			}

			// Get steps for this pipeline instance
			const steps = await db.query.step_table.findMany({
				where: and(
					eq(step_table.pipeline_instance_id, id),
					isNull(step_table.deleted_at),
				),
			});

			return c.json(
				PIPELINE_INSTANCE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "ok",
					payload: {
						...instance,
						steps,
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_INSTANCE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
