import {
	account_metadata_table,
	hasPermission,
	role_table,
	STEP_TEMPLATE_UPDATE_ROUTE,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function stepTemplateUpdateRoute(app: App) {
	app.post(STEP_TEMPLATE_UPDATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				STEP_TEMPLATE_UPDATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const {
				id,
				name,
				description,
				order,
				target_duration_days,
				color,
				icon,
				iconColor,
			} = parsed.data;

			// Get existing step template with its pipeline template to verify tenant
			const existing = await db.query.step_template_table.findFirst({
				where: and(
					eq(step_template_table.id, id),
					isNull(step_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!existing) {
				return c.json(
					STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Step template not found" },
					}),
					404,
				);
			}

			// Verify step template belongs to current tenant
			if (existing.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Step template not found" },
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
					STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to update this step template",
						},
					}),
					403,
				);
			}

			// If order is being changed, handle reordering
			if (order !== undefined && order !== existing.order) {
				// Get all step templates for this pipeline
				const allSteps = await db.query.step_template_table.findMany({
					where: and(
						eq(
							step_template_table.pipeline_template_id,
							existing.pipeline_template_id,
						),
						isNull(step_template_table.deleted_at),
					),
				});

				// Validate new order
				if (order < 0 || order >= allSteps.length) {
					return c.json(
						STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
							status: "error",
							errors: {
								order: `Order must be between 0 and ${allSteps.length - 1}`,
							},
						}),
						400,
					);
				}

				// Use transaction to reorder
				const updated = await db.transaction(async (tx) => {
					const oldOrder = existing.order;
					const newOrder = order;

					if (newOrder < oldOrder) {
						// Moving forward - shift items between new and old position backward
						const stepsToShift = allSteps.filter(
							(s) => s.order >= newOrder && s.order < oldOrder && s.id !== id,
						);
						for (const step of stepsToShift) {
							await tx
								.update(step_template_table)
								.set({ order: step.order + 1, updated_at: sql`now()` })
								.where(eq(step_template_table.id, step.id));
						}
					} else {
						// Moving backward - shift items between old and new position forward
						const stepsToShift = allSteps.filter(
							(s) => s.order > oldOrder && s.order <= newOrder && s.id !== id,
						);
						for (const step of stepsToShift) {
							await tx
								.update(step_template_table)
								.set({ order: step.order - 1, updated_at: sql`now()` })
								.where(eq(step_template_table.id, step.id));
						}
					}

					// Update the moved step
					const result = await tx
						.update(step_template_table)
						.set({
							...(name !== undefined && { name }),
							...(description !== undefined && { description }),
							order: newOrder,
							...(target_duration_days !== undefined && {
								target_duration_days,
							}),
							...(color !== undefined && { color }),
							...(icon !== undefined && { icon }),
							...(iconColor !== undefined && { iconColor }),
							updated_at: sql`now()`,
						})
						.where(eq(step_template_table.id, id))
						.returning();

					return result[0];
				});

				return c.json(
					STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "ok",
						payload: updated,
					}),
					200,
				);
			}

			// Simple update without order change
			const updated = await db
				.update(step_template_table)
				.set({
					...(name !== undefined && { name }),
					...(description !== undefined && { description }),
					...(target_duration_days !== undefined && { target_duration_days }),
					...(color !== undefined && { color }),
					...(icon !== undefined && { icon }),
					...(iconColor !== undefined && { iconColor }),
					updated_at: sql`now()`,
				})
				.where(eq(step_template_table.id, id))
				.returning();

			return c.json(
				STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				STEP_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
