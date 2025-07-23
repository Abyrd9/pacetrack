import { account_table, SESSION_REMOVE_ACCOUNT_ROUTE } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import {
  deleteCSRFTokenCookie,
  deleteSessionTokenCookie,
} from "src/utils/helpers/csrf/csrf-cookie";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionRemoveAccountRoute(app: App) {
  app.post(SESSION_REMOVE_ACCOUNT_ROUTE.path, async (c) => {
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
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(
        c.req,
        SESSION_REMOVE_ACCOUNT_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { account_id } = parsed.data;

      // Verify the account exists
      const account = await db.query.account_table.findFirst({
        where: eq(account_table.id, account_id),
      });

      if (!account) {
        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account not found" },
          }),
          404
        );
      }

      // Get the current session
      const sessionId = await getSessionClient().getSessionIdFromToken(token);
      if (!sessionId) {
        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Invalid session" },
          }),
          401
        );
      }

      const session = await getSessionClient().getSession({ sessionId });
      if (!session) {
        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Session not found" },
          }),
          401
        );
      }

      // Verify the account belongs to the current user
      if (account.user_id !== session.user_id) {
        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You don't have access to this account" },
          }),
          403
        );
      }

      // Remove ALL entries with this account_id from active_accounts
      const updatedActiveAccounts = session.active_accounts.filter(
        (activeAccount) => activeAccount.account_id !== account_id
      );

      // Check if this was the currently active account
      const wasCurrentAccount = session.account_id === account_id;

      // If no accounts left, log the user out completely
      if (updatedActiveAccounts.length === 0) {
        await getSessionClient().invalidate({ sessionId: session.id });
        await deleteSessionTokenCookie(c);
        await deleteCSRFTokenCookie(c);

        return c.json(
          SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
            status: "ok",
            payload: { message: "Account removed and user logged out" },
          }),
          200
        );
      }

      // If the removed account was the current one, switch to another account
      let newAccountId = session.account_id;
      let newTenantId = session.tenant_id;
      let newRoleId = session.role_id;

      if (wasCurrentAccount) {
        // Switch to the first available account in the list
        const nextAccount = updatedActiveAccounts[0];
        newAccountId = nextAccount.account_id;
        newTenantId = nextAccount.tenant_id;
        newRoleId = nextAccount.role_id;
      }

      // Update the session with the new active_accounts and possibly new active account
      const updatedSession = {
        ...session,
        account_id: newAccountId,
        tenant_id: newTenantId,
        role_id: newRoleId,
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
        SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            message: wasCurrentAccount
              ? "Account removed and switched to another account"
              : "Account removed from session",
          },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        SESSION_REMOVE_ACCOUNT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
