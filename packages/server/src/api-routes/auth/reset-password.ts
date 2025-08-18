import {
	account_table,
	makeResetPasswordRouteResponse,
	RESET_PASSWORD_ROUTE_PATH,
	ResetPasswordRequestSchema,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "../../db";
import { getParsedBody } from "../../utils/helpers/get-parsed-body";

export function resetPasswordRoute(app: App) {
	app.post(RESET_PASSWORD_ROUTE_PATH, async (c) => {
		try {
			const parsed = await getParsedBody(c.req, ResetPasswordRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeResetPasswordRouteResponse({
						key: RESET_PASSWORD_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { email, code, password } = parsed.data;

			const resp = await db
				.select()
				.from(account_table)
				.where(eq(account_table.email, email));

			const account = resp[0];

			if (!account) {
				return c.json(
					makeResetPasswordRouteResponse({
						key: RESET_PASSWORD_ROUTE_PATH,
						status: "error",
						errors: {
							form: "An account with this email does not exist, please sign up.",
						},
					}),
					400,
				);
			}

			if (account.reset_password_token !== code) {
				return c.json(
					makeResetPasswordRouteResponse({
						key: RESET_PASSWORD_ROUTE_PATH,
						status: "error",
						errors: {
							code: "This link is invalid. Please request a new one.",
						},
					}),
					400,
				);
			}

			const expires = account.reset_password_expires;
			if (expires && expires < new Date()) {
				return c.json(
					makeResetPasswordRouteResponse({
						key: RESET_PASSWORD_ROUTE_PATH,
						status: "error",
						errors: {
							code: "This link has expired. Please request a new one.",
						},
					}),
					400,
				);
			}

			const hashed = await Bun.password.hash(password);

			await db
				.update(account_table)
				.set({
					password: hashed,
					reset_password_token: null,
					reset_password_expires: null,
				})
				.where(eq(account_table.id, account.id));

			return c.json(
				makeResetPasswordRouteResponse({
					key: RESET_PASSWORD_ROUTE_PATH,
					status: "ok",
					payload: parsed.data,
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeResetPasswordRouteResponse({
					key: RESET_PASSWORD_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
