import {
  TENANT_DELETE_ROUTE_PATH,
  TenantDeleteRequestSchema,
  hasPermission,
  makeTenantDeleteRouteResponse,
  role_table,
  tenant_table,
  users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function tenantDeleteRoute(app: App) {
  app.post(TENANT_DELETE_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, TenantDeleteRequestSchema);
      if (!parsed.success) {
        return c.json(
          makeTenantDeleteRouteResponse({
            key: TENANT_DELETE_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }
      const { tenantId } = parsed.data;

      await db.transaction(async (tx) => {
        // Load target tenant
        const tenant = await tx.query.tenant_table.findFirst({
          where: and(
            eq(tenant_table.id, tenantId),
            isNull(tenant_table.deleted_at)
          ),
        });

        if (!tenant) {
          return c.json(
            makeTenantDeleteRouteResponse({
              key: TENANT_DELETE_ROUTE_PATH,
              status: "error",
              errors: { global: "Tenant not found" },
            }),
            404
          );
        }

        // Prevent deleting personal tenant
        if (tenant.kind === "personal") {
          return c.json(
            makeTenantDeleteRouteResponse({
              key: TENANT_DELETE_ROUTE_PATH,
              status: "error",
              errors: { global: "Personal tenant cannot be deleted" },
            }),
            400
          );
        }

        // Check permission
        const roleResp = await tx
          .select({ role: role_table })
          .from(users_to_tenants_table)
          .innerJoin(
            role_table,
            eq(role_table.id, users_to_tenants_table.role_id)
          )
          .where(
            and(
              eq(users_to_tenants_table.user_id, userId),
              eq(users_to_tenants_table.tenant_id, tenantId)
            )
          );

        const role = roleResp[0]?.role;
        if (!role || !hasPermission(role, "manage_settings")) {
          return c.json(
            makeTenantDeleteRouteResponse({
              key: TENANT_DELETE_ROUTE_PATH,
              status: "error",
              errors: { global: "You are not authorized" },
            }),
            403
          );
        }

        await tx
          .update(tenant_table)
          .set({ deleted_at: sql`now()` })
          .where(eq(tenant_table.id, tenantId));

        // Also delete the role
        await tx
          .update(users_to_tenants_table)
          .set({ deleted_at: sql`now()` })
          .where(eq(role_table.id, role.id));

        // Also delete the relations row
        await tx
          .update(users_to_tenants_table)
          .set({ deleted_at: sql`now()` })
          .where(
            and(
              eq(users_to_tenants_table.tenant_id, tenantId),
              eq(users_to_tenants_table.user_id, userId)
            )
          );
      });

      // Find the Personal tenant and switch to it in this session
      const personalTenant = await db.query.tenant_table.findFirst({
        where: and(
          eq(tenant_table.kind, "personal"),
          eq(tenant_table.created_by, userId),
          isNull(tenant_table.deleted_at) // This shouldn't be needed, but just in case
        ),
      });

      if (!personalTenant) {
        // This is very very bad.
        return c.json(
          makeTenantDeleteRouteResponse({
            key: TENANT_DELETE_ROUTE_PATH,
            status: "error",
            errors: { global: "Personal tenant not found" },
          }),
          404
        );
      }

      if (!Bun.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is not set");
      }

      const token = await getSignedCookie(
        c,
        Bun.env.SESSION_SECRET,
        "pacetrack-session"
      );

      if (!token) {
        return c.json(
          makeTenantDeleteRouteResponse({
            key: TENANT_DELETE_ROUTE_PATH,
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const sessionId = await sessions.getSessionIdFromToken(token);
      if (!sessionId) {
        return c.json(
          makeTenantDeleteRouteResponse({
            key: TENANT_DELETE_ROUTE_PATH,
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const updatedSession = await sessions.updateSessionTenant({
        sessionId,
        tenantId: personalTenant.id,
      });

      await setSessionTokenCookie(c, token, updatedSession.expires_at);

      return c.json(
        makeTenantDeleteRouteResponse({
          key: TENANT_DELETE_ROUTE_PATH,
          status: "ok",
          payload: { message: "Tenant deleted" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeTenantDeleteRouteResponse({
          key: TENANT_DELETE_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
