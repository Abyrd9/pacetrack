import { account_table } from "@pacetrack/schema";
import { SESSION_CREATE_TENANT_ROUTE } from "@pacetrack/schema/src/routes-schema/session/session.create-tenant.types";
import { eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";
import { createTenant } from "src/utils/helpers/tenant/create-tenant";

export function sessionCreateTenantRoute(app: App) {
  app.post(SESSION_CREATE_TENANT_ROUTE.path, async (c) => {
    try {
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
          SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Unauthorized" },
          }),
          401
        );
      }

      const currentSession = c.get("session");
      const parsed = await getParsedBody(
        c.req,
        SESSION_CREATE_TENANT_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { name, image, account_id } = parsed.data;

      // Verify the account exists and belongs to the current user
      const passedInAccount = await db.query.account_table.findFirst({
        where: eq(account_table.id, account_id),
      });

      if (!passedInAccount) {
        return c.json(
          SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { account_id: "Account not found" },
          }),
          404
        );
      }

      if (passedInAccount.user_id !== currentSession.user_id) {
        return c.json(
          SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
            status: "error",
            errors: { account_id: "Account not found" },
          }),
          404
        );
      }

      // Create the tenant using shared logic
      const result = await createTenant({
        name,
        accountId: account_id,
        userId: passedInAccount.user_id,
        image,
      });

      // Add the new tenant to active_accounts if not already present
      const exists = currentSession.active_accounts.some(
        (activeAccount) =>
          activeAccount.account_id === account_id &&
          activeAccount.tenant_id === result.tenant.id
      );

      const updatedActiveAccounts = exists
        ? currentSession.active_accounts
        : [
            ...currentSession.active_accounts,
            {
              account_id: account_id,
              tenant_id: result.tenant.id,
              role_id: result.role.id,
            },
          ];

      // Update the current session to switch to the new tenant
      const updatedSession = {
        ...currentSession,
        account_id: account_id,
        tenant_id: result.tenant.id,
        role_id: result.role.id,
        active_accounts: updatedActiveAccounts,
        last_verified_at: Date.now(),
      };

      // Save the updated session to Redis
      const redis = await import("src/utils/helpers/redis").then((m) =>
        m.getRedisClient()
      );
      const sessionId = currentSession.id;
      await redis.set(`session:${sessionId}`, JSON.stringify(updatedSession));
      await redis.expire(
        `session:${sessionId}`,
        Math.ceil((updatedSession.expires_at - Date.now()) / 1000)
      );

      // Refresh the session cookie with the updated session
      await setSessionTokenCookie(c, token, updatedSession.expires_at);

      return c.json(
        SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
          status: "ok",
          payload: result.tenant,
        }),
        200
      );
    } catch (error) {
      logger.error(
        "session-create-tenant",
        "Error creating tenant",
        undefined,
        error
      );
      return c.json(
        SESSION_CREATE_TENANT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
