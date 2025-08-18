import {
	ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
	AccountGroupGetByIdRequestSchema,
	account_group_table,
	account_to_account_group_table,
	makeAccountGroupGetByIdRouteResponse,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupGetByIdRoute(app: App) {
	app.post(ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(
				c.req,
				AccountGroupGetByIdRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeAccountGroupGetByIdRouteResponse({
						key: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { accountGroupId } = parsed.data;

			const accountGroupResp = await db
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
						eq(account_group_table.id, accountGroupId),
						eq(account_to_account_group_table.account_id, accountId),
						isNull(account_group_table.deleted_at),
					),
				);

			if (accountGroupResp.length === 0) {
				return c.json(
					makeAccountGroupGetByIdRouteResponse({
						key: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "Account group not found" },
					}),
					400,
				);
			}

			const targetAccountGroup = accountGroupResp[0].accountGroup;

			if (targetAccountGroup.deleted_at) {
				return c.json(
					makeAccountGroupGetByIdRouteResponse({
						key: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
						status: "error",
						errors: { global: "Account group not found" },
					}),
					400,
				);
			}

			return c.json(
				makeAccountGroupGetByIdRouteResponse({
					key: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
					status: "ok",
					payload: accountGroupResp[0].accountGroup,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountGroupGetByIdRouteResponse({
					key: ACCOUNT_GROUP_GET_BY_ID_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
