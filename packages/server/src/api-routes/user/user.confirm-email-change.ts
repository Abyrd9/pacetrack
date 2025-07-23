import {
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
  ConfirmEmailChangeRequestSchema,
  makeConfirmEmailChangeRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { resend } from "src/utils/helpers/resend";

export function userConfirmEmailChangeRoute(app: App) {
  app.post(CONFIRM_EMAIL_CHANGE_ROUTE_PATH, async (c) => {
    try {
      const parsed = await getParsedBody(
        c.req,
        ConfirmEmailChangeRequestSchema
      );
      if (!parsed.success) {
        return c.json(
          makeConfirmEmailChangeRouteResponse({
            key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, token } = parsed.data;

      const user = await db.query.user_table.findFirst({
        where: eq(user_table.pending_email_token, token),
      });

      if (!user || user.pending_email !== email) {
        return c.json(
          makeConfirmEmailChangeRouteResponse({
            key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
            status: "error",
            errors: { form: "This link is invalid. Please request a new one." },
          }),
          400
        );
      }

      const expires = user.pending_email_expires;
      if (expires && expires < new Date()) {
        return c.json(
          makeConfirmEmailChangeRouteResponse({
            key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
            status: "error",
            errors: {
              form: "This link has expired. Please request a new one.",
            },
          }),
          400
        );
      }

      const oldEmail = user.email;

      await db
        .update(user_table)
        .set({
          email: user.pending_email,
          pending_email: null,
          pending_email_token: null,
          pending_email_expires: null,
        })
        .where(eq(user_table.id, user.id));

      if (oldEmail) {
        await resend.emails
          .send({
            from: "info@pacetrack",
            to: oldEmail,
            subject: "Your Pacetrack email address was changed",
            html: "<p>If you did not initiate this change, please contact support immediately.</p>",
          })
          .catch(() => {});
      }

      return c.json(
        makeConfirmEmailChangeRouteResponse({
          key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
          status: "ok",
          payload: { email, token },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeConfirmEmailChangeRouteResponse({
          key: CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
