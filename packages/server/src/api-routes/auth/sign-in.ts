import {
  account_table,
  account_to_tenant_table,
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
        .from(account_to_tenant_table)
        .innerJoin(
          account_table,
          eq(account_to_tenant_table.account_id, account_table.id)
        )
        .innerJoin(user_table, eq(account_table.user_id, user_table.id))
        .innerJoin(
          tenant_table,
          eq(account_to_tenant_table.tenant_id, tenant_table.id)
        )
        .innerJoin(
          role_table,
          eq(account_to_tenant_table.role_id, role_table.id)
        )
        .where(eq(account_table.email, email))
        .limit(1);

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

        // But first we need to get the tenant id from the user.
        // We can either get that ID from the latest session, or if there isn't one,
        // get the tenant's personal tenant.

        const session = await getSessionClient().getLatestSession({
          userId: user.id,
        });

        // Use the tenant from the join query or fall back to personal tenant
        const effectiveTenant = session
          ? await db.query.tenant_table.findFirst({
              where: eq(tenant_table.id, session.tenant_id),
            })
          : tenant; // Use the tenant from our join query

        if (!effectiveTenant) {
          return c.json(
            SIGN_IN_ROUTE.createRouteResponse({
              status: "error",
              errors: { form: "No tenant found" },
            }),
            400
          );
        }

        const { sessionId, sessionSecretHash, sessionToken } =
          await getSessionClient().createSessionToken();

        // Create a new session
        const newSession = await getSessionClient().create({
          sessionId,
          sessionSecretHash,
          userId: user.id,
          accountId: account.id,
          tenantId: effectiveTenant.id,
          roleId: role.id,
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
