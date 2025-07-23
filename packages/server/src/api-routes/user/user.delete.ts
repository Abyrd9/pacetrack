import {
  account_to_tenant_table,
  hasPermission,
  role_table,
  USER_DELETE_ROUTE,
  user_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";

export function userDeleteRoute(app: App) {
  app.post(USER_DELETE_ROUTE.path, async (c) => {
    const requestId = Math.random().toString(36).substring(7);
    const accountId = c.get("account_id");
    const tenantId = c.get("tenant_id");

    logger.middleware(
      "USER_DELETE_ROUTE",
      "Starting user delete request",
      requestId
    );

    try {
      logger.middleware("USER_DELETE_ROUTE", "Parsing request body", requestId);

      const parsed = await getParsedBody(c.req, USER_DELETE_ROUTE.request);
      if (!parsed.success) {
        logger.middleware(
          "USER_DELETE_ROUTE",
          "Request body parsing failed",
          requestId,
          parsed.errors
        );
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      logger.middleware(
        "USER_DELETE_ROUTE",
        `Request body parsed successfully - Target User ID: ${parsed.data.userId}`,
        requestId
      );

      logger.middleware(
        "USER_DELETE_ROUTE",
        "Checking if user is allowed to delete",
        requestId,
        {
          userId: parsed.data.userId,
          accountId,
          tenantId,
        }
      );

      const result = await db
        .select()
        .from(account_to_tenant_table)
        .innerJoin(
          role_table,
          eq(account_to_tenant_table.role_id, role_table.id)
        )
        .where(
          and(
            eq(account_to_tenant_table.account_id, accountId),
            eq(account_to_tenant_table.tenant_id, tenantId)
          )
        )
        .limit(1);

      const role = result[0].roles;

      if (!role) {
        logger.middleware(
          "USER_DELETE_ROUTE",
          "User does not have a role in the account",
          requestId
        );
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            key: USER_DELETE_ROUTE.path,
            status: "error",
            errors: { global: "User does not have a role in the account" },
          }),
          403
        );
      }

      if (!hasPermission(role, "manage_users")) {
        logger.middleware(
          "USER_DELETE_ROUTE",
          "User does not have permission to delete users",
          requestId
        );
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            key: USER_DELETE_ROUTE.path,
            status: "error",
            errors: { global: "User does not have permission to delete users" },
          }),
          403
        );
      }

      logger.middleware(
        "USER_DELETE_ROUTE",
        "Checking if user exists",
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
        "USER_DELETE_ROUTE",
        `Database query completed - Found ${userRow.length} user(s)`,
        requestId
      );

      if (userRow.length === 0) {
        logger.middleware(
          "USER_DELETE_ROUTE",
          "User not found in database - returning 404",
          requestId
        );
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            key: USER_DELETE_ROUTE.path,
            status: "error",
            errors: { global: "User not found" },
          }),
          404
        );
      }

      logger.middleware(
        "USER_DELETE_ROUTE",
        "Performing soft delete on user",
        requestId
      );

      await db
        .update(user_table)
        .set({
          deleted_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .where(eq(user_table.id, parsed.data.userId));

      logger.middleware(
        "USER_DELETE_ROUTE",
        "User deleted successfully",
        requestId,
        {
          userId: parsed.data.userId,
        }
      );

      return c.json(
        USER_DELETE_ROUTE.createRouteResponse({
          key: USER_DELETE_ROUTE.path,
          status: "ok",
          payload: { message: "User deleted successfully" },
        }),
        200
      );
    } catch (error) {
      logger.middlewareError(
        "USER_DELETE_ROUTE",
        "Error during user delete",
        requestId,
        error
      );
      return c.json(
        USER_DELETE_ROUTE.createRouteResponse({
          key: USER_DELETE_ROUTE.path,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
