import { account_table, FORGOT_PASSWORD_ROUTE } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "../../db";
import { getOriginUrl } from "../../utils/helpers/domain-url";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";
import { resend } from "../../utils/helpers/resend";

export function forgotPasswordRoute(app: App) {
  app.post(FORGOT_PASSWORD_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, FORGOT_PASSWORD_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          FORGOT_PASSWORD_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email } = parsed.data;

      const account = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });

      if (!account) {
        return c.json(
          FORGOT_PASSWORD_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "Account not found",
            },
          }),
          400
        );
      }

      // Generate a token and save it to the database
      const token = Math.random().toString(36).slice(2);
      const expires = Date.now() + 3600000; // 1 hour

      await db
        .update(account_table)
        .set({
          reset_password_token: token,
          reset_password_expires: new Date(expires),
        })
        .where(eq(account_table.id, account.id));

      await resend.emails.send({
        from: "info@pacetrack.com",
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${getOriginUrl(
          c.req
        )}/auth/reset-password?email=${encodeURIComponent(
          email
        )}&token=${encodeURIComponent(
          token
        )}">here</a> to reset your password.</p>`,
      });

      return c.json(
        FORGOT_PASSWORD_ROUTE.createRouteResponse({
          status: "ok",
          payload: parsed.data,
        }),
        200
      );
    } catch {
      return c.json(
        FORGOT_PASSWORD_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
