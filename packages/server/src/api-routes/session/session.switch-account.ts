import {
  account_metadata_table,
  account_table,
  SESSION_SWITCH_ACCOUNT_ROUTE,
  user_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionSwitchAccountRoute(app: App) {
  app.post(SESSION_SWITCH_ACCOUNT_ROUTE.path, async (c) => {
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
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(
        c.req,
        SESSION_SWITCH_ACCOUNT_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { account_id } = parsed.data;

      // Verify the ACCOUNT exists and is not soft-deleted
      const account = await db.query.account_table.findFirst({
        where: and(
          eq(account_table.id, account_id),
          isNull(account_table.deleted_at)
        ),
      });

      if (!account) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "ACCOUNT not found" },
          }),
          404
        );
      }

      // Get the user for this account
      const user = await db.query.user_table.findFirst({
        where: eq(user_table.id, account.user_id),
      });

      if (!user) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "User not found" },
          }),
          404
        );
      }

      if (user.id !== c.get("user_id")) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You don't have access to this account" },
          }),
          403
        );
      }

      // Get the tenant this account is linked to
      const accountToTenant = await db
        .select()
        .from(account_metadata_table)
        .where(
          and(
            eq(account_metadata_table.account_id, account_id),
            isNull(account_metadata_table.deleted_at)
          )
        );

      if (accountToTenant.length === 0) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You don't have access to this organization" },
          }),
          403
        );
      }

      if (!accountToTenant[0].tenant_id) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You don't have access to this account" },
          }),
          403
        );
      }

      // Update the session to switch to the new ACCOUNT
      const sessionId = await getSessionClient().getSessionIdFromToken(token);
      if (!sessionId) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Invalid session" },
          }),
          401
        );
      }

      const updatedSession = await getSessionClient().updateSessionAccount({
        sessionId,
        accountId: account_id,
        tenantId: accountToTenant[0].tenant_id,
      });

      if (!updatedSession) {
        return c.json(
          SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Something went wrong" },
          }),
          500
        );
      }

      // Refresh the session cookie with the updated session
      await setSessionTokenCookie(c, token, updatedSession.expires_at);

      return c.json(
        SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
          status: "ok",
          payload: { message: "ACCOUNT switched successfully" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        SESSION_SWITCH_ACCOUNT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
