import { account_table, user_table } from "@pacetrack/schema";
import { ACCOUNT_LINK_ROUTE } from "@pacetrack/schema/src/routes-schema/acount/account.link.types";
import { and, eq, sql } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { linkAccountToUser } from "src/utils/helpers/account/link-account";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function accountLinkRoute(app: App) {
  app.post(ACCOUNT_LINK_ROUTE.path, async (c) => {
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
          ACCOUNT_LINK_ROUTE.createRouteResponse({
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
          ACCOUNT_LINK_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          401
        );
      }

      const parsed = await getParsedBody(c.req, ACCOUNT_LINK_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          ACCOUNT_LINK_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

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

      const { user, account } = result[0];

      if (account?.password) {
        const isCorrectPassword = await Bun.password.verify(
          parsed.data.password,
          account.password
        );

        if (!isCorrectPassword) {
          return c.json(
            ACCOUNT_LINK_ROUTE.createRouteResponse({
              status: "error",
              errors: {
                form: "Invalid email or password",
              },
            }),
            400
          );
        }

        // Use the shared linking logic (without session updates)
        await linkAccountToUser({
          accountToLink: account,
          userToLinkTo: user,
          currentUserId,
        });

        return c.json(
          ACCOUNT_LINK_ROUTE.createRouteResponse({
            status: "ok",
          }),
          200
        );
      } else {
        return c.json(
          ACCOUNT_LINK_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "Account does not have a password" },
          }),
          400
        );
      }
    } catch (error) {
      logger.error(
        "account-link",
        "Error during account linking",
        undefined,
        error
      );
      return c.json(
        ACCOUNT_LINK_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
