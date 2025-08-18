import {
	account_table,
	makeResetPasswordValidateRouteResponse,
	RESET_PASSWORD_VALIDATE_ROUTE_PATH,
	ResetPasswordValidateRequestSchema,
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
				ResetPasswordValidateRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeResetPasswordValidateRouteResponse({
						key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { email, code } = parsed.data;

			const account = await db.query.account_table.findFirst({
				where: eq(account_table.email, email),
			});

			if (!account) {
				return c.json(
					makeResetPasswordValidateRouteResponse({
						key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
						status: "error",
						errors: {
							email: "Account not found",
						},
					}),
					400,
				);
			}

			if (
				account.reset_password_token !== code ||
				!account.reset_password_expires
			) {
				return c.json(
					makeResetPasswordValidateRouteResponse({
						key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
						status: "error",
						errors: {
							code: "Invalid code",
						},
					}),
					400,
				);
			}

			if (
				account.reset_password_expires &&
				account.reset_password_expires < new Date()
			) {
				return c.json(
					makeResetPasswordValidateRouteResponse({
						key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
						status: "error",
						errors: {
							code: "Code expired",
						},
					}),
					400,
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
				200,
			);
		} catch (error) {
			return c.json(
				makeResetPasswordValidateRouteResponse({
					key: RESET_PASSWORD_VALIDATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
