import {
  account_to_tenant_table,
  TENANT_GET_ROUTE,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { logger } from "src/utils/helpers/logger";

export function tenantGetRoute(app: App) {
  app.get(TENANT_GET_ROUTE.path, async (c) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware("TENANT_GET", "Starting tenant get request", requestId);

    try {
      const accountId = c.get("account_id");

      logger.middleware(
        "TENANT_GET",
        `Context values - Account ID: ${accountId || "undefined"}`,
        requestId
      );

      logger.middleware(
        "TENANT_GET",
        "Querying database for tenants",
        requestId
      );

      const response = await db
        .select({ tenant: tenant_table })
        .from(tenant_table)
        .innerJoin(
          account_to_tenant_table,
          eq(account_to_tenant_table.tenant_id, tenant_table.id)
        )
        .where(
          and(
            eq(account_to_tenant_table.account_id, accountId),
            isNull(tenant_table.deleted_at)
          )
        );

      logger.middleware(
        "TENANT_GET",
        `Database query completed - Found ${response.length} tenant(s)`,
        requestId
      );

      const tenants = response.map((r) => r.tenant);

      logger.middleware(
        "TENANT_GET",
        "Tenant get completed successfully",
        requestId,
        {
          accountId: accountId,
          tenantCount: tenants.length,
        }
      );

      return c.json(
        TENANT_GET_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            tenants,
          },
        }),
        200
      );
    } catch (error) {
      logger.middlewareError(
        "TENANT_GET",
        "Error during tenant get",
        requestId,
        error
      );
      return c.json(
        TENANT_GET_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
