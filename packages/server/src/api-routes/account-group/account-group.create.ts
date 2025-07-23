import {
	ACCOUNT_GROUP_CREATE_ROUTE,
	account_group_table,
	account_metadata_table,
	hasPermission,
	role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupCreateRoute(app: App) {
	app.post(ACCOUNT_GROUP_CREATE_ROUTE.path, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(
				c.req,
				ACCOUNT_GROUP_CREATE_ROUTE.request,
			);

			if (!parsed.success) {
				return c.json(
					ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { name, description, image_url, tenant_id, parent_group_id } =
				parsed.data;

			// Verify the current account has permission to create account groups in this tenant
			const roles = await db
				.select({ accountTenant: account_metadata_table, role: role_table })
				.from(account_metadata_table)
				.leftJoin(role_table, eq(role_table.id, account_metadata_table.role_id))
				.where(
					and(
						eq(account_metadata_table.account_id, accountId),
						eq(account_metadata_table.tenant_id, tenant_id),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_roles")) {
				return c.json(
					ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
						status: "error",
						errors: {
							global: "You are not authorized to create account groups",
						},
					}),
					403,
				);
			}

			// If parent_group_id is provided, validate it
			if (parent_group_id) {
				const parentGroup = await db.query.account_group_table.findFirst({
					where: and(
						eq(account_group_table.id, parent_group_id),
						eq(account_group_table.tenant_id, tenant_id),
					),
				});

				if (!parentGroup) {
					return c.json(
						ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
							status: "error",
							errors: {
								global:
									"Parent group not found or does not belong to this tenant",
							},
						}),
						400,
					);
				}
			}

			const accountGroup = await db
				.insert(account_group_table)
				.values({
					name,
					description,
					image_url,
					tenant_id,
					parent_group_id,
					created_at: sql`now()`,
					updated_at: sql`now()`,
				})
				.returning();

			return c.json(
				ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
					status: "ok",
					payload: accountGroup[0],
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
