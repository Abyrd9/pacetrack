import {
  TENANT_GET_BY_ID_ROUTE_PATH,
  TenantGetByIdRequestSchema,
  makeTenantGetByIdRouteResponse,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function tenantGetByIdRoute(app: App) {
  app.post(TENANT_GET_BY_ID_ROUTE_PATH, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, TenantGetByIdRequestSchema);

      if (!parsed.success) {
        return c.json(
          makeTenantGetByIdRouteResponse({
            key: TENANT_GET_BY_ID_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { tenantId } = parsed.data;

      const tenant = await db.query.tenant_table.findFirst({
        where: and(
          eq(tenant_table.id, tenantId),
          isNull(tenant_table.deleted_at)
        ),
      });

      if (!tenant) {
        return c.json(
          makeTenantGetByIdRouteResponse({
            key: TENANT_GET_BY_ID_ROUTE_PATH,
            status: "error",
            errors: {
              global: "Tenant not found",
            },
          }),
          400
        );
      }

      return c.json(
        makeTenantGetByIdRouteResponse({
          key: TENANT_GET_BY_ID_ROUTE_PATH,
          status: "ok",
          payload: tenant,
        }),
        200
      );
    } catch (error) {
      return c.json(
        makeTenantGetByIdRouteResponse({
          key: TENANT_GET_BY_ID_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
