import { USER_CREATE_ROUTE, user_table } from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userCreateRoute(app: App) {
  app.post(USER_CREATE_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, USER_CREATE_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          USER_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const user = await db
        .insert(user_table)
        .values({
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning();

      return c.json(
        USER_CREATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: user[0],
        }),
        200
      );
    } catch (error) {
      return c.json(
        USER_CREATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
