import {
	makeUserCreateRouteResponse,
	USER_CREATE_ROUTE_PATH,
	UserCreateRequestSchema,
	user_table,
} from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function userCreateRoute(app: App) {
	app.post(USER_CREATE_ROUTE_PATH, async (c) => {
		const requestId = Math.random().toString(36).substring(7);

		logger.middleware("USER_CREATE", "Starting user create request", requestId);

		try {
			logger.middleware("USER_CREATE", "Parsing request body", requestId);

			const parsed = await getParsedBody(c.req, UserCreateRequestSchema);
			if (!parsed.success) {
				logger.middleware(
					"USER_CREATE",
					"Request body parsing failed",
					requestId,
					parsed.errors,
				);
				return c.json(
					makeUserCreateRouteResponse({
						key: USER_CREATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			logger.middleware(
				"USER_CREATE",
				"Request body parsed successfully",
				requestId,
			);

			logger.middleware("USER_CREATE", "Creating user in database", requestId);

			const user = await db
				.insert(user_table)
				.values({
					created_at: sql`now()`,
					updated_at: sql`now()`,
				})
				.returning();

			logger.middleware("USER_CREATE", "User created successfully", requestId, {
				userId: user[0].id,
			});

			return c.json(
				makeUserCreateRouteResponse({
					key: USER_CREATE_ROUTE_PATH,
					status: "ok",
					payload: user[0],
				}),
				200,
			);
		} catch (error) {
			logger.middlewareError(
				"USER_CREATE",
				"Error during user create",
				requestId,
				error,
			);
			return c.json(
				makeUserCreateRouteResponse({
					key: USER_CREATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
