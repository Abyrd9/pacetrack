import {
  ACCOUNT_QUERY_ROUTE,
  type Account,
  account_table,
  account_to_tenant_table,
} from "@pacetrack/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountQueryRoute(app: App) {
  app.post(ACCOUNT_QUERY_ROUTE.path, async (c) => {
    try {
      const tenantId = c.get("tenant_id");

      const parsed = await getParsedBody(c.req, ACCOUNT_QUERY_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          ACCOUNT_QUERY_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { term, page, perPage } = parsed.data;

      // total count
      const totalResp = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(account_table)
        .innerJoin(
          account_to_tenant_table,
          eq(account_to_tenant_table.account_id, account_table.id)
        )
        .where(
          and(
            eq(account_to_tenant_table.tenant_id, tenantId),
            or(
              ilike(account_table.email, `%${term}%`),
              ilike(account_table.display_name, `%${term}%`)
            )
          )
        );
      const total = totalResp[0]?.value ?? 0;

      const baseQuery = db
        .select({ account: account_table })
        .from(account_table)
        .innerJoin(
          account_to_tenant_table,
          eq(account_to_tenant_table.account_id, account_table.id)
        )
        .where(
          and(
            eq(account_to_tenant_table.tenant_id, tenantId),
            or(
              ilike(account_table.email, `%${term}%`),
              ilike(account_table.display_name, `%${term}%`)
            )
          )
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
        ACCOUNT_QUERY_ROUTE.createRouteResponse({
          status: "ok",
          payload: { accounts, ...(pagination ? { pagination } : {}) },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_QUERY_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
