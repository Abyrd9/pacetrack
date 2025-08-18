import {
	ACCOUNT_GET_ROUTE_PATH,
	type Account,
	AccountGetRequestSchema,
	account_table,
	makeAccountGetRouteResponse,
} from "@pacetrack/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGetRoute(app: App) {
	app.post(ACCOUNT_GET_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			const parsed = await getParsedBody(c.req, AccountGetRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeAccountGetRouteResponse({
						key: ACCOUNT_GET_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { page, perPage } = parsed.data;

			// Permission check (view accounts) - we assume any tenant member can view accounts
			// If stricter, can use manage_accounts.

			// Count total accounts for this user
			const totalResp = await db
				.select({ count: count() })
				.from(account_table)
				.where(
					and(
						eq(account_table.user_id, userId),
						isNull(account_table.deleted_at),
					),
				);

			const total = totalResp[0]?.count ?? 0;

			const baseQuery = db
				.select({ account: account_table })
				.from(account_table)
				.where(
					and(
						eq(account_table.user_id, userId),
						isNull(account_table.deleted_at),
					),
				);

			const rows: { account: Account }[] =
				page && perPage
					? await baseQuery.limit(perPage).offset((page - 1) * perPage)
					: await baseQuery;

			const accounts = rows.map((r) => r.account);

			let pagination:
				| { total: number; page: number; perPage: number; totalPages: number }
				| undefined;
			if (page && perPage) {
				pagination = {
					total,
					page,
					perPage,
					totalPages: Math.ceil(total / perPage),
				};
			}

			return c.json(
				makeAccountGetRouteResponse({
					key: ACCOUNT_GET_ROUTE_PATH,
					status: "ok",
					payload: { accounts, ...(pagination ? { pagination } : {}) },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGetRouteResponse({
					key: ACCOUNT_GET_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
