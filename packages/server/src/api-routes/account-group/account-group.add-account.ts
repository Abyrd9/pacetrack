import {
  ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE,
  account_group_table,
  account_to_account_group_table,
  account_to_tenant_table,
  hasPermission,
  role_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountGroupAddAccountsRoute(app: App) {
  app.post(ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");
      const parsed = await getParsedBody(
        c.req,
        ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Invalid request" },
          }),
          400
        );
      }

      const { accountGroupId, accountIds } = parsed.data;

      // Fetch the account group to get tenant
      const accountGroup = await db
        .select()
        .from(account_group_table)
        .where(eq(account_group_table.id, accountGroupId))
        .limit(1);

      if (accountGroup.length === 0) {
        return c.json(
          ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account group not found" },
          }),
          400
        );
      }
      const tenantId = accountGroup[0].tenant_id;

      // Check permission
      const roles = await db
        .select({ accountTenant: account_to_tenant_table, role: role_table })
        .from(account_to_tenant_table)
        .leftJoin(
          role_table,
          eq(role_table.id, account_to_tenant_table.role_id)
        )
        .where(
          and(
            eq(account_to_tenant_table.account_id, accountId),
            eq(account_to_tenant_table.tenant_id, tenantId)
          )
        );

      const role = roles[0]?.role;
      if (!role || !hasPermission(role, "manage_accounts")) {
        return c.json(
          ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You are not authorized to add accounts" },
          }),
          403
        );
      }

      await db.transaction(async (tx) => {
        for (const uid of accountIds) {
          const exists = await tx
            .select()
            .from(account_to_account_group_table)
            .where(
              and(
                eq(account_to_account_group_table.account_id, uid),
                eq(
                  account_to_account_group_table.account_group_id,
                  accountGroupId
                )
              )
            )
            .limit(1);

          if (exists.length === 0) {
            await tx.insert(account_to_account_group_table).values({
              account_id: uid,
              account_group_id: accountGroupId,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            });
          }
        }
      });

      return c.json(
        ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.createRouteResponse({
          status: "ok",
          payload: { message: "Accounts added" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
