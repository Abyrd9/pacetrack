import {
  account_metadata_table,
  account_table,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { SESSION_LINK_ACCOUNT_ROUTE } from "@pacetrack/schema/src/routes-schema/session/session.link-account.types";
import { and, eq, sql } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { linkAccountToUser } from "src/utils/helpers/account/link-account";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function sessionLinkAccountRoute(app: App) {
  app.post(SESSION_LINK_ACCOUNT_ROUTE.path, async (c) => {
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
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const currentUserId = c.get("user_id");
      const currentAccountId = c.get("account_id");

      if (!currentUserId || !currentAccountId) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(
        c.req,
        SESSION_LINK_ACCOUNT_ROUTE.request
      );
      if (!parsed.success) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      // Find the account to link
      const result = await db
        .select({
          user: user_table,
          account: account_table,
        })
        .from(account_table)
        .innerJoin(user_table, eq(account_table.user_id, user_table.id))
        .where(
          and(
            eq(account_table.email, parsed.data.email),
            sql`${user_table.deleted_at} IS NULL`
          )
        )
        .orderBy(sql`${user_table.created_at} ASC`)
        .limit(1);

      if (!result[0]) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "Invalid email or password",
            },
          }),
          400
        );
      }

      const { user, account } = result[0];

      if (!account?.password) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Account does not have a password" },
          }),
          400
        );
      }

      const isCorrectPassword = await Bun.password.verify(
        parsed.data.password,
        account.password
      );

      if (!isCorrectPassword) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "Invalid email or password",
            },
          }),
          400
        );
      }

      // Get the session ID from token
      const sessionId = await getSessionClient().getSessionIdFromToken(token);
      if (!sessionId) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Invalid session" },
          }),
          401
        );
      }

      const session = await getSessionClient().getSession({ sessionId });
      if (!session) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Session not found" },
          }),
          401
        );
      }

      // Use the shared linking logic
      const targetUserId = await linkAccountToUser({
        accountToLink: account,
        userToLinkTo: user,
        currentUserId,
      });

      // Get ALL tenants for ALL accounts that now belong to the target user
      const allAccountTenants = await db
        .select({
          account_id: account_metadata_table.account_id,
          tenant_id: account_metadata_table.tenant_id,
          role_id: account_metadata_table.role_id,
          tenant_kind: tenant_table.kind,
        })
        .from(account_metadata_table)
        .innerJoin(
          tenant_table,
          eq(account_metadata_table.tenant_id, tenant_table.id)
        )
        .where(eq(account_metadata_table.user_id, targetUserId));

      // Update session's user_id and add all tenants to active_accounts
      const updatedActiveAccounts = [...session.active_accounts];
      for (const accountTenant of allAccountTenants) {
        const exists = updatedActiveAccounts.some(
          (activeAccount) =>
            activeAccount.account_id === accountTenant.account_id &&
            activeAccount.tenant_id === accountTenant.tenant_id
        );

        if (!exists) {
          updatedActiveAccounts.push({
            account_id: accountTenant.account_id,
            tenant_id: accountTenant.tenant_id,
            role_id: accountTenant.role_id,
          });
        }
      }

      // Find the newly linked account's personal tenant to use as primary
      const linkedAccountTenants = allAccountTenants.filter(
        (t) => t.account_id === account.id
      );
      const personalTenant = linkedAccountTenants.find(
        (t) => t.tenant_kind === "personal"
      );
      const primaryTenant = personalTenant || linkedAccountTenants[0];

      if (!primaryTenant) {
        return c.json(
          SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account has no tenant access" },
          }),
          500
        );
      }

      // Update session with the linked account as primary and new active_accounts
      const updatedSession = {
        ...session,
        user_id: targetUserId,
        account_id: account.id,
        tenant_id: primaryTenant.tenant_id,
        role_id: primaryTenant.role_id,
        active_accounts: updatedActiveAccounts,
        last_verified_at: Date.now(),
      };

      // Save the updated session to Redis
      const redis = await import("src/utils/helpers/redis").then((m) =>
        m.getRedisClient()
      );
      await redis.set(`session:${sessionId}`, JSON.stringify(updatedSession));
      await redis.expire(
        `session:${sessionId}`,
        Math.ceil((updatedSession.expires_at - Date.now()) / 1000)
      );

      // Refresh the session cookie
      await setSessionTokenCookie(c, token, updatedSession.expires_at);

      return c.json(
        SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            message: "Account linked successfully",
          },
        }),
        200
      );
    } catch (error) {
      logger.error(
        "session-link-account",
        "Error during account linking",
        undefined,
        error
      );
      return c.json(
        SESSION_LINK_ACCOUNT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
