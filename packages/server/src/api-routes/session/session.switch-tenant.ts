import {
  account_metadata_table,
  SESSION_SWITCH_TENANT_ROUTE,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionSwitchTenantRoute(app: App) {
  app.post(SESSION_SWITCH_TENANT_ROUTE.path, async (c) => {
    try {
      const userId = c.get("user_id");

      if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is not set");
      }

      const token = await getSignedCookie(
        c,
        process.env.SESSION_SECRET,
        "pacetrack-session"
      );

      if (!token) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(
        c.req,
        SESSION_SWITCH_TENANT_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { tenant_id } = parsed.data;

      // Verify the tenant exists
      const tenant = await db.query.tenant_table.findFirst({
        where: eq(tenant_table.id, tenant_id),
      });

      if (!tenant) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Tenant not found" },
          }),
          404
        );
      }

      // Verify the user account has access to this tenant
      const accountTenant = await db
        .select()
        .from(account_metadata_table)
        .where(
          and(
            eq(account_metadata_table.user_id, userId),
            eq(account_metadata_table.tenant_id, tenant_id)
          )
        )
        .limit(1);

      if (accountTenant.length === 0) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You don't have access to this organization" },
          }),
          403
        );
      }

      // Update the session to switch to the new tenant
      const sessionId = await getSessionClient().getSessionIdFromToken(token);
      if (!sessionId) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Invalid session" },
          }),
          401
        );
      }

      const updatedSession = await getSessionClient().updateSessionTenant({
        sessionId,
        tenantId: tenant_id,
        accountId: accountTenant[0].account_id,
      });

      if (!updatedSession) {
        return c.json(
          SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Something went wrong" },
          }),
          500
        );
      }

      // Refresh the session cookie with the updated session
      await setSessionTokenCookie(c, token, updatedSession.expires_at);

      return c.json(
        SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
          status: "ok",
          payload: { message: "Tenant switched successfully" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        SESSION_SWITCH_TENANT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
