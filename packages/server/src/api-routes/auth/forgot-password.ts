import {
  FORGOT_PASSWORD_ROUTE_PATH,
  ForgotPasswordRequestSchema,
  makeForgotPasswordRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "../../db";
import { getOriginUrl } from "../../utils/helpers/domain-url";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";
import { resend } from "../../utils/helpers/resend";

export function forgotPasswordRoute(app: App) {
  app.post(FORGOT_PASSWORD_ROUTE_PATH, async (c) => {
    try {
      const parsed = await getParsedBody(c.req, ForgotPasswordRequestSchema);

      if (!parsed.success) {
        return c.json(
          makeForgotPasswordRouteResponse({
            key: FORGOT_PASSWORD_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email } = parsed.data;

      const user = await db.query.user_table.findFirst({
        where: eq(user_table.email, email),
      });

      if (!user) {
        return c.json(
          makeForgotPasswordRouteResponse({
            key: FORGOT_PASSWORD_ROUTE_PATH,
            status: "error",
            errors: {
              form: "User not found",
            },
          }),
          400
        );
      }

      // Generate a token and save it to the database
      const token = Math.random().toString(36).slice(2);
      const expires = Date.now() + 3600000; // 1 hour

      await db
        .update(user_table)
        .set({
          reset_password_token: token,
          reset_password_expires: new Date(expires),
        })
        .where(eq(user_table.id, user.id));

      await resend.emails.send({
        from: "info@abyrd-remix-template",
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
        makeForgotPasswordRouteResponse({
          key: FORGOT_PASSWORD_ROUTE_PATH,
          status: "ok",
          payload: parsed.data,
        }),
        200
      );
    } catch (error) {
      return c.json(
        makeForgotPasswordRouteResponse({
          key: FORGOT_PASSWORD_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
