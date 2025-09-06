import {
  account_table,
  RESET_PASSWORD_VALIDATE_ROUTE,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function resetPasswordValidateRoute(app: App) {
  app.post(RESET_PASSWORD_VALIDATE_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(
        c.req,
        RESET_PASSWORD_VALIDATE_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, code } = parsed.data;

      const account = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });

      if (!account) {
        return c.json(
          RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              email: "Account not found",
            },
          }),
          400
        );
      }

      if (
        account.reset_password_token !== code ||
        !account.reset_password_expires
      ) {
        return c.json(
          RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              code: "Invalid code",
            },
          }),
          400
        );
      }

      if (
        account.reset_password_expires &&
        account.reset_password_expires < new Date()
      ) {
        return c.json(
          RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              code: "Code expired",
            },
          }),
          400
        );
      }

      return c.json(
        RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            email,
            code,
          },
        }),
        200
      );
    } catch {
      return c.json(
        RESET_PASSWORD_VALIDATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
