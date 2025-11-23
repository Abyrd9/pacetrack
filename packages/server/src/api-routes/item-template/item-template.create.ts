import {
	account_metadata_table,
	hasPermission,
	ITEM_TEMPLATE_CREATE_ROUTE,
	item_template_table,
	pipeline_template_table,
	role_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function itemTemplateCreateRoute(app: App) {
	app.post(ITEM_TEMPLATE_CREATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				ITEM_TEMPLATE_CREATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { name, description, pipeline_template_id, initial_step_index } =
				parsed.data;

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
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
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
			if (!role || !hasPermission(role, "manage_templates")) {
				return c.json(
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to create item templates",
						},
					}),
					403,
				);
			}

			// Get step templates to resolve initial_step_index to initial_step_id
			const stepTemplates = await db.query.step_template_table.findMany({
				where: and(
					eq(step_template_table.pipeline_template_id, pipeline_template_id),
					isNull(step_template_table.deleted_at),
				),
				orderBy: (step_template_table, { asc }) => [
					asc(step_template_table.order),
				],
			});

			if (stepTemplates.length === 0) {
				return c.json(
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global:
								"Cannot create item template: pipeline has no step templates",
						},
					}),
					400,
				);
			}

			// Validate initial_step_index
			if (
				initial_step_index < 0 ||
				initial_step_index >= stepTemplates.length
			) {
				return c.json(
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							initial_step_index: `Initial step index must be between 0 and ${stepTemplates.length - 1}`,
						},
					}),
					400,
				);
			}

			const initialStepTemplate = stepTemplates[initial_step_index];
			if (!initialStepTemplate) {
				return c.json(
					ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							initial_step_index: "Could not find step template at this index",
						},
					}),
					500,
				);
			}

			// Create item template
			const created = await db
				.insert(item_template_table)
				.values({
					name,
					description,
					pipeline_template_id,
					initial_step_id: initialStepTemplate.id,
					created_by: accountId,
					created_at: sql`now()`,
					updated_at: sql`now()`,
				})
				.returning();

			return c.json(
				ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: created[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ITEM_TEMPLATE_CREATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
