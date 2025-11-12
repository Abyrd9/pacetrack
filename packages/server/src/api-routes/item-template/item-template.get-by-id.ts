import {
	ITEM_TEMPLATE_GET_BY_ID_ROUTE,
	item_template_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function itemTemplateGetByIdRoute(app: App) {
	app.post(ITEM_TEMPLATE_GET_BY_ID_ROUTE.path, async (c) => {
		try {
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(
				c.req,
				ITEM_TEMPLATE_GET_BY_ID_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ITEM_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id } = parsed.data;

			// Get item template with its pipeline template to verify tenant
			const itemTemplate = await db.query.item_template_table.findFirst({
				where: and(
					eq(item_template_table.id, id),
					isNull(item_template_table.deleted_at),
				),
				with: {
					pipeline_template: true,
				},
			});

			if (!itemTemplate) {
				return c.json(
					ITEM_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Item template not found",
						},
					}),
					404,
				);
			}

			// Verify item template belongs to current tenant
			if (itemTemplate.pipeline_template.tenant_id !== tenantId) {
				return c.json(
					ITEM_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "Item template not found",
						},
					}),
					404,
				);
			}

			return c.json(
				ITEM_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "ok",
					payload: itemTemplate,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ITEM_TEMPLATE_GET_BY_ID_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
