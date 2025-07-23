import { account_table, SIGN_UP_ROUTE, user_table } from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "../../db";
import { createAccount } from "../../utils/helpers/account/create-account";
import { setSessionTokenCookie } from "../../utils/helpers/auth/auth-cookie";
import { getSessionClient } from "../../utils/helpers/auth/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf/csrf";
import { setCSRFTokenCookie } from "../../utils/helpers/csrf/csrf-cookie";
import { getDeviceInfo } from "../../utils/helpers/get-device-info";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function signUpRoute(app: App) {
  app.post(SIGN_UP_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, SIGN_UP_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          SIGN_UP_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, password } = parsed.data;
      const userAlreadyExists = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });

      if (userAlreadyExists) {
        return c.json(
          SIGN_UP_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "Account already exists",
            },
          }),
          400
        );
      }

      // Create user and account in a single transaction
      const { user, account, tenant, role } = await db.transaction(
        async (tx) => {
          // Create the user first
          const userResult = await tx
            .insert(user_table)
            .values({
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          if (userResult.length === 0) {
            throw new Error("User not created");
          }

          const user = userResult[0];

          // Create account with personal tenant using the shared helper
          const { account, tenant, role } = await createAccount({
            userId: user.id,
            email,
            password,
            tx,
          });

          return { user, account, tenant, role };
        }
      );

      // Create session for the new user
      const { sessionId, sessionSecretHash, sessionToken } =
        await getSessionClient().createSessionToken();

      // Get device information from request
      const deviceInfo = getDeviceInfo(c);

      const newSession = await getSessionClient().create({
        sessionId,
        sessionSecretHash,
        userId: user.id,
        accountId: account.id,
        tenantId: tenant.id,
        roleId: role.id,
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
        SIGN_UP_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            account,
            user,
            csrfToken,
          },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        SIGN_UP_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
