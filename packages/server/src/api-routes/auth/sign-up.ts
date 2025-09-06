import {
  account_table,
  account_to_tenant_table,
  DEFAULT_ROLES,
  membership_table,
  role_table,
  SIGN_UP_ROUTE,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
import type { App } from "src";
import { setCSRFTokenCookie } from "src/utils/helpers/csrf/csrf-cookie";
import { createNewCustomer } from "src/utils/helpers/stripe/new-customer";
import { db } from "../../db";
import { setSessionTokenCookie } from "../../utils/helpers/auth/auth-cookie";
import { getSessionClient } from "../../utils/helpers/auth/auth-session";
import { generateCSRFToken } from "../../utils/helpers/csrf/csrf";
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

      return db
        .transaction(async (tx) => {
          const hashed = await Bun.password.hash(password);

          const user = await tx
            .insert(user_table)
            .values({
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          const account = await tx
            .insert(account_table)
            .values({
              email,
              password: hashed,
              user_id: user[0].id,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          const { customer, subscription } = await createNewCustomer(
            user[0],
            account[0]
          );

          const membership = await tx
            .insert(membership_table)
            .values({
              customer_id: customer.id,
              subscription_id: subscription.id,
              created_by: user[0].id,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          // Create the tenant
          const tenant = await tx
            .insert(tenant_table)
            .values({
              name: "Personal",
              created_by: user[0].id,
              kind: "personal",
              membership_id: membership[0].id,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          // Create the owner role for this tenant
          const ownerRole = await tx
            .insert(role_table)
            .values({
              ...DEFAULT_ROLES.OWNER,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          // Assign the account to the tenant with the owner role
          await tx.insert(account_to_tenant_table).values({
            account_id: account[0].id,
            tenant_id: tenant[0].id,
            role_id: ownerRole[0].id,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          });

          const { sessionId, sessionSecretHash, sessionToken } =
            await getSessionClient().createSessionToken();

          const newSession = await getSessionClient().create({
            sessionId,
            sessionSecretHash,
            userId: user[0].id,
            accountId: account[0].id,
            tenantId: tenant[0].id,
            roleId: ownerRole[0].id, // TODO: This is wrong, we need to get the role from the user
          });

          // Generate CSRF token for this session
          const csrfToken = await generateCSRFToken(sessionToken);

          await setSessionTokenCookie(
            c,
            sessionToken,
            new Date(newSession.expires_at)
          );

          // Set CSRF token as a cookie for server-side access
          await setCSRFTokenCookie(
            c,
            csrfToken,
            new Date(newSession.expires_at)
          );

          return c.json(
            SIGN_UP_ROUTE.createRouteResponse({
              status: "ok",
              payload: {
                account: account[0],
                user: user[0],
                csrfToken, // Include CSRF token in response
              },
            }),
            200
          );
        })
        .catch(() => {
          return c.json(
            SIGN_UP_ROUTE.createRouteResponse({
              status: "error",
              errors: { global: "Something went wrong." },
            }),
            400
          );
        });
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
