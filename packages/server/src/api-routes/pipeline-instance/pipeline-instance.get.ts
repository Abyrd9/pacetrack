import {
	PIPELINE_INSTANCE_GET_ROUTE,
	pipeline_instance_table,
} from "@pacetrack/schema";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineInstanceGetRoute(app: App) {
	app.post(PIPELINE_INSTANCE_GET_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_INSTANCE_GET_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_INSTANCE_GET_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { search, status, page, perPage } = parsed.data;

			// Build base query conditions
			const baseConditions = [isNull(pipeline_instance_table.deleted_at)];

			// Add status filter if provided
			if (status) {
				baseConditions.push(eq(pipeline_instance_table.status, status));
			}

			// Add search filter if provided (search in name)
			if (search) {
				baseConditions.push(ilike(pipeline_instance_table.name, `%${search}%`));
			}

			// Get instances with their pipeline templates to filter by tenant
			const instances = await db.query.pipeline_instance_table.findMany({
				where: and(...baseConditions),
				with: {
					pipeline_template: true,
				},
				orderBy: [desc(pipeline_instance_table.created_at)],
			});

			// Filter by tenant (through pipeline template)
			const tenantInstances = instances.filter(
				(instance) => instance.pipeline_template.tenant_id === tenantId,
			);

			// Handle pagination if requested
			if (page !== undefined && perPage !== undefined) {
				const total = tenantInstances.length;
				const totalPages = Math.ceil(total / perPage);
				const offset = (page - 1) * perPage;
				const paginatedInstances = tenantInstances.slice(
					offset,
					offset + perPage,
				);

				// Remove the nested pipeline_template from response
				const cleanInstances = paginatedInstances.map(
					({ pipeline_template, ...instance }) => instance,
				);

				return c.json(
					PIPELINE_INSTANCE_GET_ROUTE.createRouteResponse({
						status: "ok",
						payload: {
							instances: cleanInstances,
							pagination: {
								total,
								page,
								perPage,
								totalPages,
							},
						},
					}),
					200,
				);
			}

			// No pagination - return all instances
			const cleanInstances = tenantInstances.map(
				({ pipeline_template, ...instance }) => instance,
			);

			return c.json(
				PIPELINE_INSTANCE_GET_ROUTE.createRouteResponse({
					status: "ok",
					payload: {
						instances: cleanInstances,
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_INSTANCE_GET_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
