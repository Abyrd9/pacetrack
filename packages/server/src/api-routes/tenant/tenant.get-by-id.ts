import {
	account_to_tenant_table,
	makeTenantGetByIdRouteResponse,
	TENANT_GET_BY_ID_ROUTE_PATH,
	TenantGetByIdRequestSchema,
	tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { logger } from "src/utils/helpers/logger";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function tenantGetByIdRoute(app: App) {
	app.post(TENANT_GET_BY_ID_ROUTE_PATH, async (c) => {
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware(
			"TENANT_GET_BY_ID",
			"Starting tenant get by ID request",
			requestId,
		);

		try {
			const accountId = c.get("account_id");

			logger.middleware("TENANT_GET_BY_ID", "Parsing request body", requestId);

			const parsed = await getParsedBody(c.req, TenantGetByIdRequestSchema);

			if (!parsed.success) {
				logger.middleware(
					"TENANT_GET_BY_ID",
					"Request body parsing failed",
					requestId,
					parsed.errors,
				);
				return c.json(
					makeTenantGetByIdRouteResponse({
						key: TENANT_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			logger.middleware(
				"TENANT_GET_BY_ID",
				`Request body parsed successfully - Target Tenant ID: ${parsed.data.tenantId}`,
				requestId,
			);

			const { tenantId } = parsed.data;

			logger.middleware(
				"TENANT_GET_BY_ID",
				"Querying database for tenant",
				requestId,
			);

			// Check if user has access to this tenant and get the tenant data
			const tenantResponse = await db
				.select({ tenant: tenant_table })
				.from(tenant_table)
				.innerJoin(
					account_to_tenant_table,
					eq(account_to_tenant_table.tenant_id, tenant_table.id),
				)
				.where(
					and(
						eq(tenant_table.id, tenantId),
						eq(account_to_tenant_table.account_id, accountId),
						isNull(tenant_table.deleted_at),
					),
				)
				.limit(1);

			const tenant = tenantResponse[0]?.tenant;

			logger.middleware(
				"TENANT_GET_BY_ID",
				`Database query completed - Tenant found: ${tenant ? "yes" : "no"}`,
				requestId,
			);

			if (!tenant) {
				logger.middleware(
					"TENANT_GET_BY_ID",
					"Tenant not found or access denied - returning 404",
					requestId,
				);
				return c.json(
					makeTenantGetByIdRouteResponse({
						key: TENANT_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: {
							global: "Tenant not found or access denied",
						},
					}),
					404,
				);
			}

			logger.middleware(
				"TENANT_GET_BY_ID",
				`Tenant found - ID: ${tenant.id}, Name: ${tenant.name}, Deleted: ${tenant.deleted_at ? "yes" : "no"}`,
				requestId,
			);

			logger.middleware(
				"TENANT_GET_BY_ID",
				"Tenant get by ID completed successfully",
				requestId,
				{
					tenantId: tenant.id,
				},
			);

			return c.json(
				makeTenantGetByIdRouteResponse({
					key: TENANT_GET_BY_ID_ROUTE_PATH,
					status: "ok",
					payload: tenant,
				}),
				200,
			);
		} catch (error) {
			logger.middlewareError(
				"TENANT_GET_BY_ID",
				"Error during tenant get by ID",
				requestId,
				error,
			);
			return c.json(
				makeTenantGetByIdRouteResponse({
					key: TENANT_GET_BY_ID_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
