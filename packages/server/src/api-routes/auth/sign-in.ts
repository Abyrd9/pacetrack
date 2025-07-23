import {
  account_metadata_table,
  account_table,
  role_table,
  SIGN_IN_ROUTE,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { db } from "../../db";
import { getSessionClient } from "../../utils/helpers/auth/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf/csrf";
import { setCSRFTokenCookie } from "../../utils/helpers/csrf/csrf-cookie";
import { getDeviceInfo } from "../../utils/helpers/get-device-info";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function signInRoute(app: App) {
  app.post(SIGN_IN_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, SIGN_IN_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          SIGN_IN_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, password } = parsed.data;

      // Get user, tenant, and role in a single query
      const userTenantResult = await db
        .select({
          user: user_table,
          account: account_table,
          tenant: tenant_table,
          role: role_table,
        })
        .from(account_metadata_table)
        .innerJoin(
          account_table,
          eq(account_metadata_table.account_id, account_table.id)
        )
        .innerJoin(user_table, eq(account_table.user_id, user_table.id))
        .innerJoin(
          tenant_table,
          eq(account_metadata_table.tenant_id, tenant_table.id)
        )
        .innerJoin(
          role_table,
          eq(account_metadata_table.role_id, role_table.id)
        )
        .where(eq(account_table.email, email));

      if (userTenantResult.length === 0) {
        return c.json(
          SIGN_IN_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "A user with this email does not exist.",
            },
          }),
          400
        );
      }

      const { user, account, tenant, role } = userTenantResult[0];

      if (account?.password) {
        const isCorrectPassword = await Bun.password.verify(
          password,
          account.password
        );

        if (!isCorrectPassword) {
          return c.json(
            SIGN_IN_ROUTE.createRouteResponse({
              status: "error",
              errors: {
                form: "Invalid email or password",
              },
            }),
            400
          );
        }

        // If the account has a reset password token, we'll clear it out
        // because they've successfully remembered their password.
        if (account.reset_password_token) {
          await db
            .update(account_table)
            .set({
              reset_password_expires: null,
              reset_password_token: null,
            })
            .where(eq(account_table.id, account.id));
        }

        // By this point we've successfully signed in the user.
        // We'll create a new session for them and return the session token.

        const { sessionId, sessionSecretHash, sessionToken } =
          await getSessionClient().createSessionToken();

        // Get device information from request
        const deviceInfo = getDeviceInfo(c);

        // Check for previous session from this device to restore preferences
        const previousSession = await getSessionClient().getLastSessionByDevice(
          {
            userId: user.id,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            deviceFingerprint: deviceInfo.deviceFingerprint,
          }
        );

        // Use tenant from their last session on this device, or fall back to personal tenant
        const preferredTenantId = previousSession?.tenant_id ?? tenant.id;

        // Create a new session with all available accounts
        // Also includes past active accounts that the user may have been signed into
        let active = userTenantResult.map((result) => ({
          accountId: result.account.id,
          tenantId: result.tenant.id,
          roleId: result.role.id,
        }));

        // Also includes past active accounts that the user may have been signed into
        for (const activeItem of previousSession?.active_accounts ?? []) {
          active.push({
            accountId: activeItem.account_id,
            tenantId: activeItem.tenant_id,
            roleId: activeItem.role_id,
          });
        }

        // Remove duplicates by account + tenant combination
        active = active.filter(
          (activeItem, index, self) =>
            index ===
            self.findIndex(
              (t) =>
                t.accountId === activeItem.accountId &&
                t.tenantId === activeItem.tenantId
            )
        );

        const newSession = await getSessionClient().create({
          sessionId,
          sessionSecretHash,
          userId: user.id,
          accountId: account.id,
          tenantId: preferredTenantId,
          roleId: role.id,
          activeAccounts: active,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          deviceFingerprint: deviceInfo.deviceFingerprint,
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
          SIGN_IN_ROUTE.createRouteResponse({
            status: "ok",
            payload: {
              user,
              account,
              csrfToken, // Include CSRF token in response
            },
          }),
          200
        );
      }

      return c.json(
        SIGN_IN_ROUTE.createRouteResponse({
          status: "error",
          errors: {
            form: "Invalid email or password",
          },
        }),
        400
      );
    } catch (error) {
      console.error(error);
      return c.json(
        SIGN_IN_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
