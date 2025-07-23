import {
  ACCOUNT_GROUP_CREATE_ROUTE,
  account_group_table,
  account_to_tenant_table,
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
      const parsed = await getParsedBody(c.req, ACCOUNT_GROUP_CREATE_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { name, description, image_url, tenant_id } = parsed.data;

      // Verify the current account has permission to create account groups in this tenant
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
            eq(account_to_tenant_table.tenant_id, tenant_id)
          )
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
          403
        );
      }

      const accountGroup = await db
        .insert(account_group_table)
        .values({
          name,
          description,
          image_url,
          tenant_id,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning();

      return c.json(
        ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: accountGroup[0],
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_GROUP_CREATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
