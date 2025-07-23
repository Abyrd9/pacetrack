import {
  account_metadata_table,
  TENANT_GET_BY_ID_ROUTE,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function tenantGetByIdRoute(app: App) {
  app.post(TENANT_GET_BY_ID_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");

      const parsed = await getParsedBody(c.req, TENANT_GET_BY_ID_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          TENANT_GET_BY_ID_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { tenantId } = parsed.data;

      // Check if user has access to this tenant and get the tenant data
      const tenantResponse = await db
        .select({ tenant: tenant_table })
        .from(tenant_table)
        .innerJoin(
          account_metadata_table,
          eq(account_metadata_table.tenant_id, tenant_table.id)
        )
        .where(
          and(
            eq(tenant_table.id, tenantId),
            eq(account_metadata_table.account_id, accountId),
            isNull(tenant_table.deleted_at)
          )
        )
        .limit(1);

      const tenant = tenantResponse[0]?.tenant;

      if (!tenant) {
        return c.json(
          TENANT_GET_BY_ID_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global: "Tenant not found or access denied",
            },
          }),
          404
        );
      }

      return c.json(
        TENANT_GET_BY_ID_ROUTE.createRouteResponse({
          status: "ok",
          payload: tenant,
        }),
        200
      );
    } catch (error) {
      return c.json(
        TENANT_GET_BY_ID_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
