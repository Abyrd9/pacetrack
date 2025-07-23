import {
  ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE,
  account_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { resend } from "src/utils/helpers/resend";

export function accountConfirmEmailChangeRoute(app: App) {
  app.post(ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path, async (c) => {
    try {
      const parsed = await getParsedBody(
        c.req,
        ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.request
      );
      if (!parsed.success) {
        return c.json(
          ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, token } = parsed.data;

      const account = await db.query.account_table.findFirst({
        where: eq(account_table.pending_email_token, token),
      });

      if (!account || account.pending_email !== email) {
        return c.json(
          ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.createRouteResponse({
            status: "error",
            errors: { form: "This link is invalid. Please request a new one." },
          }),
          400
        );
      }

      const expires = account.pending_email_expires;
      if (expires && expires < new Date()) {
        return c.json(
          ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              form: "This link has expired. Please request a new one.",
            },
          }),
          400
        );
      }

      const oldEmail = account.email;

      await db
        .update(account_table)
        .set({
          email: account.pending_email,
          pending_email: null,
          pending_email_token: null,
          pending_email_expires: null,
        })
        .where(eq(account_table.id, account.id));

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
        ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.createRouteResponse({
          status: "ok",
          payload: { email, token },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
