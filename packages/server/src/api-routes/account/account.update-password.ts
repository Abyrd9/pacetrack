import {
  ACCOUNT_UPDATE_PASSWORD_ROUTE,
  account_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function updatePasswordRoute(app: App) {
  app.post(ACCOUNT_UPDATE_PASSWORD_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");

      const parsed = await getParsedBody(
        c.req,
        ACCOUNT_UPDATE_PASSWORD_ROUTE.request
      );
      if (!parsed.success) {
        return c.json(
          ACCOUNT_UPDATE_PASSWORD_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { password } = parsed.data;

      const hashed = await Bun.password.hash(password);

      await db
        .update(account_table)
        .set({
          password: hashed,
        })
        .where(eq(account_table.id, accountId));

      return c.json(
        ACCOUNT_UPDATE_PASSWORD_ROUTE.createRouteResponse({
          status: "ok",
          payload: {},
        }),
        200
      );
    } catch {
      return c.json(
        ACCOUNT_UPDATE_PASSWORD_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
