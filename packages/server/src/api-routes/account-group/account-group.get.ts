import {
	ACCOUNT_GROUP_GET_ROUTE_PATH,
	type AccountGroup,
	AccountGroupGetRequestSchema,
	account_group_table,
	account_to_account_group_table,
	makeAccountGroupGetRouteResponse,
	tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupGetRoute(app: App) {
	app.post(ACCOUNT_GROUP_GET_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const tenantId = c.get("tenant_id");

			const parsed = await getParsedBody(c.req, AccountGroupGetRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeAccountGroupGetRouteResponse({
						key: ACCOUNT_GROUP_GET_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { scope = "account", page, perPage } = parsed.data;

			// Fetch rows based on scope
			let accountGroups: AccountGroup[] = [];
			let total = 0;

			if (scope === "account") {
				// total
				const totalResp = await db
					.select({ value: sql<number>`count(*)::int` })
					.from(account_group_table)
					.innerJoin(
						account_to_account_group_table,
						eq(
							account_to_account_group_table.account_group_id,
							account_group_table.id,
						),
					)
					.where(
						and(
							eq(account_to_account_group_table.account_id, accountId),
							isNull(account_group_table.deleted_at),
						),
					);
				total = totalResp[0]?.value ?? 0;

				// paginated
				const baseQueryAccount = db
					.select({ accountGroup: account_group_table })
					.from(account_group_table)
					.innerJoin(
						account_to_account_group_table,
						eq(
							account_to_account_group_table.account_group_id,
							account_group_table.id,
						),
					)
					.where(
						and(
							eq(account_to_account_group_table.account_id, accountId),
							isNull(account_group_table.deleted_at),
						),
					);

				const rows =
					page && perPage
						? await baseQueryAccount.limit(perPage).offset((page - 1) * perPage)
						: await baseQueryAccount;
				accountGroups = rows.map((r) => r.accountGroup);
			} else {
				const tenant = await db.query.tenant_table.findFirst({
					where: eq(tenant_table.id, tenantId),
				});

				if (!tenant) {
					return c.json(
						makeAccountGroupGetRouteResponse({
							key: ACCOUNT_GROUP_GET_ROUTE_PATH,
							status: "error",
							errors: { global: "Tenant not found" },
						}),
						400,
					);
				}

				const totalResp = await db
					.select({ value: sql<number>`count(*)::int` })
					.from(account_group_table)
					.where(
						and(
							eq(account_group_table.tenant_id, tenant.id),
							isNull(account_group_table.deleted_at),
						),
					);

				total = totalResp[0]?.value ?? 0;

				const baseQueryTenant = db
					.select({ accountGroup: account_group_table })
					.from(account_group_table)
					.where(
						and(
							eq(account_group_table.tenant_id, tenant.id),
							isNull(account_group_table.deleted_at),
						),
					);

				const rows =
					page && perPage
						? await baseQueryTenant.limit(perPage).offset((page - 1) * perPage)
						: await baseQueryTenant;
				accountGroups = rows.map((r) => r.accountGroup);
			}

			let paginationMeta:
				| {
						total: number;
						page: number;
						perPage: number;
						totalPages: number;
				  }
				| undefined;

			if (page && perPage) {
				const totalPages = Math.ceil(total / perPage);
				paginationMeta = { total, page, perPage, totalPages };
			}

			return c.json(
				makeAccountGroupGetRouteResponse({
					key: ACCOUNT_GROUP_GET_ROUTE_PATH,
					status: "ok",
					payload: {
						accountGroups,
						...(paginationMeta ? { pagination: paginationMeta } : {}),
					},
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGroupGetRouteResponse({
					key: ACCOUNT_GROUP_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
