import { account_table, TENANT_CREATE_ROUTE } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createTenant } from "src/utils/helpers/tenant/create-tenant";

export function tenantCreateRoute(app: App) {
  app.post(TENANT_CREATE_ROUTE.path, async (c) => {
    try {
      const currentSession = c.get("session");
      const parsed = await getParsedBody(c.req, TENANT_CREATE_ROUTE.request);

      if (!parsed.success) {
        return c.json(
          TENANT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { name, image, account_id } = parsed.data;

      // Verify the account exists and belongs to the current user
      const passedInAccount = await db.query.account_table.findFirst({
        where: eq(account_table.id, account_id),
      });

      if (!passedInAccount) {
        return c.json(
          TENANT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { account_id: "Account not found" },
          }),
          404
        );
      }

      if (passedInAccount.user_id !== currentSession.user_id) {
        return c.json(
          TENANT_CREATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { account_id: "Account not found" },
          }),
          404
        );
      }

      // Use the shared tenant creation logic (without session updates)
      const result = await createTenant({
        name,
        accountId: account_id,
        userId: passedInAccount.user_id,
        image,
      });

      return c.json(
        TENANT_CREATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: result.tenant,
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        TENANT_CREATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
