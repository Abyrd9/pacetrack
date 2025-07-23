import {
	UPDATE_PASSWORD_ROUTE_PATH,
	UpdatePasswordRequestSchema,
	makeUpdatePasswordRouteResponse,
	user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function updatePasswordRoute(app: App) {
	app.post(UPDATE_PASSWORD_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

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
				.update(user_table)
				.set({
					password: hashed,
				})
				.where(eq(user_table.id, userId));

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
