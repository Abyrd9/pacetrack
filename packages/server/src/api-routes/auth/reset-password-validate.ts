import {
  RESET_PASSWORD_VALIDATE_ROUTE_PATH,
  ResetPasswordValidateRequestSchema,
  makeResetPasswordValidateRouteResponse,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function resetPasswordValidateRoute(app: App) {
  app.post(RESET_PASSWORD_VALIDATE_ROUTE_PATH, async (c) => {
    try {
      const parsed = await getParsedBody(
        c.req,
        ResetPasswordValidateRequestSchema
      );

      if (!parsed.success) {
        return c.json(
          makeResetPasswordValidateRouteResponse({
            key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { email, code } = parsed.data;

      const user = await db.query.user_table.findFirst({
        where: eq(user_table.email, email),
      });

      if (!user) {
        return c.json(
          makeResetPasswordValidateRouteResponse({
            key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
            status: "error",
            errors: {
              email: "User not found",
            },
          }),
          400
        );
      }

      if (user.reset_password_token !== code || !user.reset_password_expires) {
        return c.json(
          makeResetPasswordValidateRouteResponse({
            key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
            status: "error",
            errors: {
              code: "Invalid code",
            },
          }),
          400
        );
      }

      if (
        user.reset_password_expires &&
        user.reset_password_expires < new Date()
      ) {
        return c.json(
          makeResetPasswordValidateRouteResponse({
            key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
            status: "error",
            errors: {
              code: "Code expired",
            },
          }),
          400
        );
      }

      return c.json(
        makeResetPasswordValidateRouteResponse({
          key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
          status: "ok",
          payload: {
            email,
            code,
          },
        }),
        200
      );
    } catch (error) {
      return c.json(
        makeResetPasswordValidateRouteResponse({
          key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
