import {
	ACCOUNT_GET_BY_ID_ROUTE_PATH,
	type Account,
	AccountGetByIdRequestSchema,
	account_table,
	account_to_tenant_table,
	makeAccountGetByIdRouteResponse,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function accountGetByIdRoute(app: App) {
	app.post(ACCOUNT_GET_BY_ID_ROUTE_PATH, async (c) => {
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware(
			"ACCOUNT_GET_BY_ID",
			"Starting account get by ID request",
			requestId,
		);

		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				`Context values - Account ID: ${accountId || "undefined"}, Tenant ID: ${tenantId || "undefined"}`,
				requestId,
			);

			logger.middleware("ACCOUNT_GET_BY_ID", "Parsing request body", requestId);

			const parsed = await getParsedBody(c.req, AccountGetByIdRequestSchema);
			if (!parsed.success) {
				logger.middleware(
					"ACCOUNT_GET_BY_ID",
					"Request body parsing failed",
					requestId,
					parsed.errors,
				);
				return c.json(
					makeAccountGetByIdRouteResponse({
						key: ACCOUNT_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				`Request body parsed successfully - Target Account ID: ${parsed.data.accountId}`,
				requestId,
			);

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				"Querying database for account",
				requestId,
			);

			// Ensure requested account belongs to tenant
			const accountRow = await db
				.select({ account: account_table })
				.from(account_table)
				.innerJoin(
					account_to_tenant_table,
					eq(account_to_tenant_table.account_id, account_table.id),
				)
				.where(
					and(
						eq(account_table.id, parsed.data.accountId),
						eq(account_to_tenant_table.tenant_id, tenantId),
					),
				)
				.limit(1);

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				`Database query completed - Found ${accountRow.length} account(s)`,
				requestId,
			);

			if (accountRow.length === 0) {
				logger.middleware(
					"ACCOUNT_GET_BY_ID",
					"Account not found in database - returning 400",
					requestId,
				);
				return c.json(
					makeAccountGetByIdRouteResponse({
						key: ACCOUNT_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "Account not found" },
					}),
					400,
				);
			}

			const targetAccount: Account = accountRow[0].account;

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				`Account found - ID: ${targetAccount.id}, Email: ${targetAccount.email}, Deleted: ${targetAccount.deleted_at ? "yes" : "no"}`,
				requestId,
			);

			if (targetAccount.deleted_at) {
				logger.middleware(
					"ACCOUNT_GET_BY_ID",
					"Account is deleted - returning 400",
					requestId,
				);
				return c.json(
					makeAccountGetByIdRouteResponse({
						key: ACCOUNT_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "Account not found" },
					}),
					400,
				);
			}

			logger.middleware(
				"ACCOUNT_GET_BY_ID",
				"Account get by ID completed successfully",
				requestId,
				{
					accountId: targetAccount.id,
					tenantId: tenantId,
				},
			);

			return c.json(
				makeAccountGetByIdRouteResponse({
					key: ACCOUNT_GET_BY_ID_ROUTE_PATH,
					status: "ok",
					payload: targetAccount,
				}),
				200,
			);
		} catch (error) {
			logger.middlewareError(
				"ACCOUNT_GET_BY_ID",
				"Error during account get by ID",
				requestId,
				error,
			);
			return c.json(
				makeAccountGetByIdRouteResponse({
					key: ACCOUNT_GET_BY_ID_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
