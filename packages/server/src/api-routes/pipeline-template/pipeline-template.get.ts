import {
	PIPELINE_TEMPLATE_GET_ROUTE,
	pipeline_template_table,
} from "@pacetrack/schema";
import { and, asc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineTemplateGetRoute(app: App) {
	app.post(PIPELINE_TEMPLATE_GET_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_TEMPLATE_GET_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_TEMPLATE_GET_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Invalid request parameters" },
					}),
					400,
				);
			}

			const { search } = parsed.data;

			// Build query conditions
			const conditions: SQL<unknown>[] = [
				eq(pipeline_template_table.tenant_id, tenantId),
				isNull(pipeline_template_table.deleted_at),
			];

			// Add search filter if provided (search in name and description)
			if (search) {
				const searchCondition = or(
					ilike(pipeline_template_table.name, `%${search}%`),
					ilike(pipeline_template_table.description, `%${search}%`),
				);
				if (searchCondition) {
					conditions.push(searchCondition);
				}
			}

			// Get pipeline templates
			const templates = await db.query.pipeline_template_table.findMany({
				where: and(...conditions),
				orderBy: [asc(pipeline_template_table.name)],
			});

			return c.json(
				PIPELINE_TEMPLATE_GET_ROUTE.createRouteResponse({
					status: "ok",
					payload: {
						templates,
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_TEMPLATE_GET_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
