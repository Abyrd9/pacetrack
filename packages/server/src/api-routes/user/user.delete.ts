import { USER_DELETE_ROUTE } from "@pacetrack/schema";
import type { App } from "src";
import { deleteUserEntirely } from "src/utils/helpers/account/delete-account";
import { checkUserDeletionBlockers } from "src/utils/helpers/account/delete-account-validation";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userDeleteRoute(app: App) {
  app.post(USER_DELETE_ROUTE.path, async (c) => {
    try {
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, USER_DELETE_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      // Require "DELETE" as confirmation
      if (parsed.data.confirmation !== "DELETE") {
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: { confirmation: "Please type DELETE to confirm" },
          }),
          400
        );
      }

      // Check for blockers
      const blockers = await checkUserDeletionBlockers(userId);

      if (blockers.length > 0) {
        return c.json(
          USER_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global: `Cannot delete user: ${blockers.map((b) => b.message).join(", ")}`,
            },
          }),
          400
        );
      }

      // Delete the user entirely (this handles all cascade deletions and session revocations)
      await deleteUserEntirely(userId);

      // Note: No need to handle session here since deleteUserEntirely revokes all sessions
      // The user will be logged out automatically

      return c.json(
        USER_DELETE_ROUTE.createRouteResponse({
          status: "ok",
          payload: { message: "User deleted successfully" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        USER_DELETE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
