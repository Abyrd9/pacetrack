import {
	account_metadata_table,
	hasPermission,
	PIPELINE_TEMPLATE_CREATE_ROUTE,
	pipeline_template_table,
	role_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function pipelineTemplateCreateRoute(app: App) {
	app.post(PIPELINE_TEMPLATE_CREATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				PIPELINE_TEMPLATE_CREATE_ROUTE.request,
			);

			if (!parsed.success) {
				if (parsed.errors.step_templates) {
					return c.json(
						PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
							status: "error",
							errors: {
								global: "Issues with step templates",
							},
						}),
						400,
					);
				} else {
					return c.json(
						PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
							status: "error",
							errors: {
								name: parsed.errors.name,
								description: parsed.errors.description,
								icon: parsed.errors.icon,
								iconColor: parsed.errors.iconColor,
							},
						}),
						400,
					);
				}
			}

			const { name, description, icon, iconColor, step_templates } =
				parsed.data;

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
					PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to create pipeline templates",
						},
					}),
					403,
				);
			}

			return await db
				.transaction(async (tx) => {
					// Create pipeline template
					const createPipelineTemplateResp = await tx
						.insert(pipeline_template_table)
						.values({
							name,
							description,
							icon,
							iconColor,
							tenant_id: tenantId,
							created_by: accountId,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					const template = createPipelineTemplateResp[0];
					if (!template) {
						tx.rollback();
						throw new Error("Failed to create pipeline template");
					}

					// validate the order in the step templates
					for (const stepTemplate of step_templates) {
						if (
							stepTemplate.order < 0 ||
							stepTemplate.order > step_templates.length
						) {
							tx.rollback();
							throw new Error("Step template order out of bounds");
						}
					}

					console.log("step_templates", step_templates);

					// create the step templates
					const createStepTemplatesResp = await tx
						.insert(step_template_table)
						.values(
							step_templates.map((step) => ({
								...step,
								pipeline_template_id: template.id,
								created_by: accountId,
								created_at: sql`now()`,
								updated_at: sql`now()`,
							})),
						)
						.returning();

					return c.json(
						PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
							status: "ok",
							payload: {
								...template,
								step_templates: createStepTemplatesResp,
							},
						}),
						200,
					);
				})
				.catch((error) => {
					return c.json(
						PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: error.message },
						}),
						500,
					);
				});
		} catch (error) {
			console.error(error);
			return c.json(
				PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
