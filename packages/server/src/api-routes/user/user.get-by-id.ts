import { USER_GET_BY_ID_ROUTE, type User, user_table } from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function userGetByIdRoute(app: App) {
  app.post(USER_GET_BY_ID_ROUTE.path, async (c) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.middleware(
      "USER_GET_BY_ID_ROUTE",
      "Starting user get by ID request",
      requestId
    );

    try {
      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        "Parsing request body",
        requestId
      );

      const parsed = await getParsedBody(c.req, USER_GET_BY_ID_ROUTE.request);
      if (!parsed.success) {
        logger.middleware(
          "USER_GET_BY_ID_ROUTE",
          "Request body parsing failed",
          requestId,
          parsed.errors
        );
        return c.json(
          USER_GET_BY_ID_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        `Request body parsed successfully - Target User ID: ${parsed.data.userId}`,
        requestId
      );

      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        "Querying database for user",
        requestId
      );

      const userRow = await db
        .select()
        .from(user_table)
        .where(
          and(
            eq(user_table.id, parsed.data.userId),
            isNull(user_table.deleted_at)
          )
        )
        .limit(1);

      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        `Database query completed - Found ${userRow.length} user(s)`,
        requestId
      );

      if (userRow.length === 0) {
        logger.middleware(
          "USER_GET_BY_ID_ROUTE",
          "User not found in database - returning 404",
          requestId
        );
        return c.json(
          USER_GET_BY_ID_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "User not found" },
          }),
          404
        );
      }

      const targetUser: User = userRow[0];

      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        `User found - ID: ${targetUser.id}, Deleted: ${targetUser.deleted_at ? "yes" : "no"}`,
        requestId
      );

      logger.middleware(
        "USER_GET_BY_ID_ROUTE",
        "User get by ID completed successfully",
        requestId,
        {
          userId: targetUser.id,
        }
      );

      return c.json(
        USER_GET_BY_ID_ROUTE.createRouteResponse({
          status: "ok",
          payload: targetUser,
        }),
        200
      );
    } catch (error) {
      logger.middlewareError(
        "USER_GET_BY_ID_ROUTE",
        "Error during user get by ID",
        requestId,
        error
      );
      return c.json(
        USER_GET_BY_ID_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
