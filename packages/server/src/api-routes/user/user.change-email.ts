import {
  CHANGE_EMAIL_ROUTE_PATH,
  ChangeEmailRequestSchema,
  makeChangeEmailRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getOriginUrl } from "src/utils/helpers/domain-url";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { resend } from "src/utils/helpers/resend";

export function userChangeEmailRoute(app: App) {
  app.post(CHANGE_EMAIL_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, ChangeEmailRequestSchema);
      if (!parsed.success) {
        return c.json(
          makeChangeEmailRouteResponse({
            key: CHANGE_EMAIL_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email } = parsed.data;

      const user = await db.query.user_table.findFirst({
        where: eq(user_table.id, userId),
      });

      if (!user) {
        return c.json(
          makeChangeEmailRouteResponse({
            key: CHANGE_EMAIL_ROUTE_PATH,
            status: "error",
            errors: { global: "User not found" },
          }),
          400
        );
      }

      if (email === user?.email) {
        return c.json(
          makeChangeEmailRouteResponse({
            key: CHANGE_EMAIL_ROUTE_PATH,
            status: "error",
            errors: { email: "This is already your current email" },
          }),
          400
        );
      }

      const existing = await db.query.user_table.findFirst({
        where: eq(user_table.email, email),
      });
      if (existing) {
        return c.json(
          makeChangeEmailRouteResponse({
            key: CHANGE_EMAIL_ROUTE_PATH,
            status: "error",
            errors: { email: "A user with this email already exists" },
          }),
          400
        );
      }

      const token = Math.random().toString(36).slice(2);
      const expires = Date.now() + 3600 * 1000;

      await db
        .update(user_table)
        .set({
          pending_email: email,
          pending_email_token: token,
          pending_email_expires: new Date(expires),
        })
        .where(eq(user_table.id, userId));

      const confirmUrl = `${getOriginUrl(
        c.req
      )}/callback/confirm-email-change?email=${encodeURIComponent(
        email
      )}&token=${encodeURIComponent(token)}`;

      await resend.emails.send({
        from: "info@pacetrack",
        to: email,
        subject: "Confirm your new email address",
        html: `<p>Click <a href="${confirmUrl}">here</a> to confirm your new email address.</p>`,
      });

      return c.json(
        makeChangeEmailRouteResponse({
          key: CHANGE_EMAIL_ROUTE_PATH,
          status: "ok",
          payload: { email },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeChangeEmailRouteResponse({
          key: CHANGE_EMAIL_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
