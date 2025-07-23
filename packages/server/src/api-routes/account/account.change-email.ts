import { ACCOUNT_CHANGE_EMAIL_ROUTE, account_table } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getOriginUrl } from "src/utils/helpers/domain-url";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";
import { resend } from "src/utils/helpers/resend";

export function accountChangeEmailRoute(app: App) {
  app.post(ACCOUNT_CHANGE_EMAIL_ROUTE.path, async (c) => {
    const requestId = Math.random().toString(36).substring(7);
    logger.middleware(
      "ACCOUNT_CHANGE_EMAIL_ROUTE",
      "Starting change-email request",
      requestId
    );
    try {
      const accountId = c.get("account_id");

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Parsing request body",
        requestId
      );
      const parsed = await getParsedBody(
        c.req,
        ACCOUNT_CHANGE_EMAIL_ROUTE.request
      );
      if (!parsed.success) {
        logger.middleware(
          "ACCOUNT_CHANGE_EMAIL_ROUTE",
          "Request body parsing failed",
          requestId,
          parsed.errors
        );
        return c.json(
          ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email } = parsed.data;

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Querying database for current account",
        requestId,
        { accountId }
      );
      const account = await db.query.account_table.findFirst({
        where: eq(account_table.id, accountId),
      });

      if (!account) {
        logger.middleware(
          "ACCOUNT_CHANGE_EMAIL_ROUTE",
          "Account not found",
          requestId,
          {
            accountId,
          }
        );
        return c.json(
          ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account not found" },
          }),
          400
        );
      }

      if (email === account?.email) {
        logger.middleware(
          "ACCOUNT_CHANGE_EMAIL_ROUTE",
          "Requested email matches current email",
          requestId,
          { accountId, email }
        );
        return c.json(
          ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
            status: "error",
            errors: { email: "This is already your current email" },
          }),
          400
        );
      }

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Checking for existing account with target email",
        requestId,
        { email }
      );
      const existing = await db.query.account_table.findFirst({
        where: eq(account_table.email, email),
      });
      if (existing) {
        logger.middleware(
          "ACCOUNT_CHANGE_EMAIL_ROUTE",
          "Email already in use",
          requestId,
          { email }
        );
        return c.json(
          ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
            status: "error",
            errors: { email: "A account with this email already exists" },
          }),
          400
        );
      }

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Generating confirmation token",
        requestId
      );
      const token = Math.random().toString(36).slice(2);
      const expires = Date.now() + 3600 * 1000;

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Saving pending email + token",
        requestId,
        { accountId, email }
      );
      await db
        .update(account_table)
        .set({
          pending_email: email,
          pending_email_token: token,
          pending_email_expires: new Date(expires),
        })
        .where(eq(account_table.id, accountId));

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Composing email confirmation URL",
        requestId
      );
      const confirmUrl = `${getOriginUrl(
        c.req
      )}/callback/confirm-email-change?email=${encodeURIComponent(
        email
      )}&token=${encodeURIComponent(token)}`;

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Sending confirmation email",
        requestId,
        { to: email }
      );
      await resend.emails.send({
        from: "info@pacetrack",
        to: email,
        subject: "Confirm your new email address",
        html: `<p>Click <a href="${confirmUrl}">here</a> to confirm your new email address.</p>`,
      });

      logger.middleware(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Change-email request completed successfully",
        requestId,
        { accountId, email }
      );
      return c.json(
        ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
          status: "ok",
          payload: { email },
        }),
        200
      );
    } catch (error) {
      logger.middlewareError(
        "ACCOUNT_CHANGE_EMAIL_ROUTE",
        "Error during change-email",
        requestId,
        error
      );
      return c.json(
        ACCOUNT_CHANGE_EMAIL_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
