import { account_table, user_table } from "@pacetrack/schema";
import { ACCOUNT_CREATE_ROUTE } from "@pacetrack/schema/src/routes-schema/acount/account.create.types";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { createAccount } from "src/utils/helpers/account/create-account";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountCreateRoute(app: App) {
  app.post(ACCOUNT_CREATE_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, ACCOUNT_CREATE_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          ACCOUNT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { user_id, email, password } = parsed.data;

      // Check if user exists
      const user = await db.query.user_table.findFirst({
        where: eq(user_table.id, user_id),
      });

      if (!user) {
        return c.json(
          ACCOUNT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "User not found" },
          }),
          404
        );
      }

      // Check authorization - user_id must match current session user
      if (user.id !== c.get("user_id")) {
        return c.json(
          ACCOUNT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Unauthorized" },
          }),
          404
        );
      }

      // Check if account with this email already exists
      const existingAccount = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });

      if (existingAccount) {
        return c.json(
          ACCOUNT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { email: "An account with this email already exists" },
          }),
          409
        );
      }

      // Use the shared account creation logic (without session updates)
      const result = await createAccount({
        userId: user_id,
        email,
        password,
      });

      return c.json(
        ACCOUNT_CREATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            user,
            account: result.account,
          },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_CREATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
