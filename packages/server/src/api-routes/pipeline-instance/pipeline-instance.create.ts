import {
	account_metadata_table,
	hasPermission,
	PIPELINE_INSTANCE_CREATE_ROUTE,
	pipeline_instance_table,
	pipeline_template_table,
	role_table,
	step_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineInstanceCreateRoute(app: App) {
	app.post(PIPELINE_INSTANCE_CREATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_INSTANCE_CREATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { name, pipeline_template_id } = parsed.data;

			// Verify the pipeline template exists and belongs to this tenant
			const template = await db.query.pipeline_template_table.findFirst({
				where: and(
					eq(pipeline_template_table.id, pipeline_template_id),
					eq(pipeline_template_table.tenant_id, tenantId),
					isNull(pipeline_template_table.deleted_at),
				),
			});

			if (!template) {
				return c.json(
					PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							pipeline_template_id:
								"Pipeline template not found or does not belong to this tenant",
						},
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
			if (!role || !hasPermission(role, "manage_pipelines")) {
				return c.json(
					PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to create pipeline instances",
						},
					}),
					403,
				);
			}

			return await db
				.transaction(async (tx) => {
					const createPipelineInstanceResp = await tx
						.insert(pipeline_instance_table)
						.values({
							name,
							pipeline_template_id,
							tenant_id: tenantId,
							created_by: accountId,
							start_date: sql`now()`,
							created_at: sql`now()`,
							updated_at: sql`now()`,
							status_updated_at: sql`now()`,
						})
						.returning();

					// Need to get the steps and create the pipeline steps
					const pipelineTemplateSteps =
						await tx.query.step_template_table.findMany({
							where: and(
								eq(
									step_template_table.pipeline_template_id,
									pipeline_template_id,
								),
								isNull(step_template_table.deleted_at),
							),
							orderBy: [asc(step_template_table.order)],
						});

					const createPipelineStepsResp = await tx
						.insert(step_table)
						.values(
							pipelineTemplateSteps.map((step) => ({
								step_template_id: step.id,
								pipeline_instance_id: createPipelineInstanceResp[0].id,
								created_by: accountId,
								created_at: sql`now()`,
								updated_at: sql`now()`,
							})),
						)
						.returning();

					return c.json(
						PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
							status: "ok",
							payload: {
								...createPipelineInstanceResp[0],
								steps: createPipelineStepsResp,
							},
						}),
						200,
					);
				})
				.catch((error) => {
					return c.json(
						PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: error.message },
						}),
						500,
					);
				});
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_INSTANCE_CREATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
