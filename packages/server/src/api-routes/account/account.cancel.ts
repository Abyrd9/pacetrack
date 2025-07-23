import {
  ACCOUNT_CANCEL_ROUTE_PATH,
  AccountCancelRequestSchema,
  account_table,
  hasPermission,
  makeAccountCancelRouteResponse,
  role_table,
  tenant_table,
  users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { stripe } from "src/utils/helpers/stripe";

export function accountCancelRoute(app: App) {
  app.post(ACCOUNT_CANCEL_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, AccountCancelRequestSchema);
      if (!parsed.success) {
        return c.json(
          makeAccountCancelRouteResponse({
            key: ACCOUNT_CANCEL_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }
      const { accountId } = parsed.data;

      const account = await db.query.account_table.findFirst({
        where: eq(account_table.id, accountId),
      });
      if (!account) {
        return c.json(
          makeAccountCancelRouteResponse({
            key: ACCOUNT_CANCEL_ROUTE_PATH,
            status: "error",
            errors: { global: "Account not found" },
          }),
          404
        );
      }

      // permission check
      const roles = await db
        .select({ role: role_table })
        .from(tenant_table)
        .innerJoin(
          users_to_tenants_table,
          eq(users_to_tenants_table.tenant_id, tenant_table.id)
        )
        .innerJoin(
          role_table,
          eq(role_table.id, users_to_tenants_table.role_id)
        )
        .where(
          and(
            eq(tenant_table.account_id, accountId),
            eq(users_to_tenants_table.user_id, userId),
            isNull(tenant_table.deleted_at)
          )
        );
      const hasManage = roles.some((r) =>
        hasPermission(r.role, "manage_billing")
      );
      if (!hasManage) {
        return c.json(
          makeAccountCancelRouteResponse({
            key: ACCOUNT_CANCEL_ROUTE_PATH,
            status: "error",
            errors: { global: "You are not authorized" },
          }),
          403
        );
      }

      if (!account.subscription_id) {
        return c.json(
          makeAccountCancelRouteResponse({
            key: ACCOUNT_CANCEL_ROUTE_PATH,
            status: "error",
            errors: { global: "No active subscription" },
          }),
          400
        );
      }

      await stripe.subscriptions.cancel(account.subscription_id);

      await db
        .update(account_table)
        .set({ subscription_id: null })
        .where(eq(account_table.id, accountId));

      return c.json(
        makeAccountCancelRouteResponse({
          key: ACCOUNT_CANCEL_ROUTE_PATH,
          status: "ok",
          payload: { message: "Subscription canceled" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeAccountCancelRouteResponse({
          key: ACCOUNT_CANCEL_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
