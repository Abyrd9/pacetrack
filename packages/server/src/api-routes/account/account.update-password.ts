import {
	account_table,
	makeUpdatePasswordRouteResponse,
	UPDATE_PASSWORD_ROUTE_PATH,
	UpdatePasswordRequestSchema,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function updatePasswordRoute(app: App) {
	app.post(UPDATE_PASSWORD_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");

			const parsed = await getParsedBody(c.req, UpdatePasswordRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeUpdatePasswordRouteResponse({
						key: UPDATE_PASSWORD_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { password } = parsed.data;

			const hashed = await Bun.password.hash(password);

			await db
				.update(account_table)
				.set({
					password: hashed,
				})
				.where(eq(account_table.id, accountId));

			return c.json(
				makeUpdatePasswordRouteResponse({
					key: UPDATE_PASSWORD_ROUTE_PATH,
					status: "ok",
					payload: {},
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeUpdatePasswordRouteResponse({
					key: UPDATE_PASSWORD_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
