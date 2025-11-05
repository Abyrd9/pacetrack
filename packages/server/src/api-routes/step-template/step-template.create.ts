import {
	account_metadata_table,
	hasPermission,
	pipeline_template_table,
	role_table,
	STEP_TEMPLATE_CREATE_ROUTE,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function stepTemplateCreateRoute(app: App) {
	app.post(STEP_TEMPLATE_CREATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				STEP_TEMPLATE_CREATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const {
				name,
				description,
				pipeline_template_id,
				order,
				target_duration_days,
				color,
				icon,
				iconColor,
			} = parsed.data;

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
					STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
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
					STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to create step templates",
						},
					}),
					403,
				);
			}

			// Get existing step templates to handle order updates
			const existingStepTemplates = await db.query.step_template_table.findMany(
				{
					where: and(
						eq(step_template_table.pipeline_template_id, pipeline_template_id),
						isNull(step_template_table.deleted_at),
					),
				},
			);

			// Validate order is within acceptable range
			// Valid orders: 0 to existingStepTemplates.length (inclusive)
			// This allows inserting at start (0), anywhere in middle, or at end (length)
			if (order < 0 || order > existingStepTemplates.length) {
				return c.json(
					STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							order: `Order must be between 0 and ${existingStepTemplates.length}. Cannot skip positions.`,
						},
					}),
					400,
				);
			}

			// Sort by order
			const sortedSteps = existingStepTemplates.sort(
				(a, b) => a.order - b.order,
			);

			// Find all steps at or after the new order position that need to be pushed back
			const stepsToUpdate = sortedSteps.filter((step) => step.order >= order);

			// Create step template with transaction to ensure consistency
			const stepTemplate = await db.transaction(async (tx) => {
				// First, increment the order of all steps at or after the insertion point
				if (stepsToUpdate.length > 0) {
					for (const step of stepsToUpdate) {
						await tx
							.update(step_template_table)
							.set({
								order: step.order + 1,
								updated_at: sql`now()`,
							})
							.where(eq(step_template_table.id, step.id));
					}
				}

				// Then create the new step template at the specified order
				const created = await tx
					.insert(step_template_table)
					.values({
						name,
						description,
						pipeline_template_id,
						order,
						target_duration_days,
						color,
						icon,
						iconColor,
						created_by: accountId,
						created_at: sql`now()`,
						updated_at: sql`now()`,
					})
					.returning();

				return created[0];
			});

			return c.json(
				STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: stepTemplate,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				STEP_TEMPLATE_CREATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
