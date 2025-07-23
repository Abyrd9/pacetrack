import { account_table } from "@pacetrack/schema";
import { SESSION_CREATE_ACCOUNT_ROUTE } from "@pacetrack/schema/src/routes-schema/session/session.create-account.types";
import { eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { createAccount } from "src/utils/helpers/account/create-account";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { generateCSRFToken } from "src/utils/helpers/csrf/csrf";
import { setCSRFTokenCookie } from "src/utils/helpers/csrf/csrf-cookie";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function sessionCreateAccountRoute(app: App) {
  app.post(SESSION_CREATE_ACCOUNT_ROUTE.path, async (c) => {
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
          SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(
        c.req,
        SESSION_CREATE_ACCOUNT_ROUTE.request
      );
      if (!parsed.success) {
        return c.json(
          SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { user_id, email, password } = parsed.data;

      // Check authorization - user_id must match current session user
      if (user_id !== c.get("user_id")) {
        return c.json(
          SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          403
        );
      }

      // Check if account with this email already exists
      const existingAccount = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });

      if (existingAccount) {
        return c.json(
          SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { email: "An account with this email already exists" },
          }),
          409
        );
      }

      // Get user
      const user = await db.query.user_table.findFirst({
        where: (users, { eq }) => eq(users.id, user_id),
      });

      if (!user) {
        return c.json(
          SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "User not found" },
          }),
          404
        );
      }

      // Create the account using shared logic
      const result = await createAccount({
        userId: user_id,
        email,
        password,
      });

      // Get current session
      const oldSession = c.get("session");

      // Create new session with the new account
      const { sessionId, sessionSecretHash, sessionToken } =
        await getSessionClient().createSessionToken();

      const newSession = await getSessionClient().create({
        sessionId,
        sessionSecretHash,
        userId: user.id,
        accountId: result.account.id,
        tenantId: result.tenant.id,
        roleId: result.role.id,
        activeAccounts: [
          ...oldSession.active_accounts.map((account) => ({
            accountId: account.account_id,
            tenantId: account.tenant_id,
            roleId: account.role_id,
          })),
          {
            accountId: result.account.id,
            tenantId: result.tenant.id,
            roleId: result.role.id,
          },
        ],
      });

      // Generate CSRF token for this session
      const csrfToken = await generateCSRFToken(sessionToken);

      await setSessionTokenCookie(
        c,
        sessionToken,
        new Date(newSession.expires_at)
      );

      // Set CSRF token as a cookie for server-side access
      await setCSRFTokenCookie(c, csrfToken, new Date(newSession.expires_at));

      return c.json(
        SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            user,
            account: result.account,
            csrfToken,
          },
        }),
        200
      );
    } catch (error) {
      logger.error(
        "session-create-account",
        "Error creating account",
        undefined,
        error
      );
      return c.json(
        SESSION_CREATE_ACCOUNT_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
