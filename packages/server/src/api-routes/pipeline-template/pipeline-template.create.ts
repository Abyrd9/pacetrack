import {
	account_metadata_table,
	hasPermission,
	item_template_table,
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

			const {
				name,
				description,
				icon,
				iconColor,
				step_templates,
				item_template,
			} = parsed.data;

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

					// Validate initial_step_index
					if (
						item_template.initial_step_index < 0 ||
						item_template.initial_step_index >= createStepTemplatesResp.length
					) {
						tx.rollback();
						throw new Error("Invalid initial step index");
					}

					// Get the step template at the initial_step_index
					const initialStepTemplate =
						createStepTemplatesResp[item_template.initial_step_index];
					if (!initialStepTemplate) {
						tx.rollback();
						throw new Error("Could not find initial step template");
					}

					const possibleFieldsDefinition = item_template.fields_definition
						? item_template.fields_definition
						: sql`'{}'::jsonb`;

					// Create the item template
					const createItemTemplateResp = await tx
						.insert(item_template_table)
						.values({
							name: item_template.name,
							description: item_template.description,
							pipeline_template_id: template.id,
							initial_step_id: initialStepTemplate.id,
							fields_definition: possibleFieldsDefinition,
							created_by: accountId,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					const itemTemplate = createItemTemplateResp[0];
					if (!itemTemplate) {
						tx.rollback();
						throw new Error("Failed to create item template");
					}

					return c.json(
						PIPELINE_TEMPLATE_CREATE_ROUTE.createRouteResponse({
							status: "ok",
							payload: {
								...template,
								step_templates: createStepTemplatesResp,
								item_template: itemTemplate,
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
