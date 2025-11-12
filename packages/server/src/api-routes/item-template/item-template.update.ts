import {
	account_metadata_table,
	hasPermission,
	ITEM_TEMPLATE_UPDATE_ROUTE,
	item_template_table,
	role_table,
	step_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function itemTemplateUpdateRoute(app: App) {
	app.post(ITEM_TEMPLATE_UPDATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				ITEM_TEMPLATE_UPDATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, description, initial_step_index, version } =
				parsed.data;

			// Get existing item template with its pipeline template to verify tenant
			const existing = await db.query.item_template_table.findFirst({
				where: and(
					eq(item_template_table.id, id),
					isNull(item_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!existing) {
				return c.json(
					ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Item template not found" },
					}),
					404,
				);
			}

			// Verify item template belongs to current tenant
			if (existing.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Item template not found" },
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
					ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to update this item template",
						},
					}),
					403,
				);
			}

			// If initial_step_index is being updated, resolve it to initial_step_id
			let initial_step_id: string | undefined;
			if (initial_step_index !== undefined) {
				const stepTemplates = await db.query.step_template_table.findMany({
					where: and(
						eq(
							step_template_table.pipeline_template_id,
							existing.pipeline_template_id,
						),
						isNull(step_template_table.deleted_at),
					),
					orderBy: (step_template_table, { asc }) => [
						asc(step_template_table.order),
					],
				});

				if (
					initial_step_index < 0 ||
					initial_step_index >= stepTemplates.length
				) {
					return c.json(
						ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
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
						ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
							status: "error",
							errors: {
								initial_step_index:
									"Could not find step template at this index",
							},
						}),
						500,
					);
				}

				initial_step_id = initialStepTemplate.id;
			}

			// Update item template
			const updated = await db
				.update(item_template_table)
				.set({
					...(name !== undefined && { name }),
					...(description !== undefined && { description }),
					...(initial_step_id !== undefined && { initial_step_id }),
					...(version !== undefined && { version }),
					updated_at: sql`now()`,
				})
				.where(eq(item_template_table.id, id))
				.returning();

			return c.json(
				ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: updated[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ITEM_TEMPLATE_UPDATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
