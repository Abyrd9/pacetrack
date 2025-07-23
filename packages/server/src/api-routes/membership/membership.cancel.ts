import {
  account_to_tenant_table,
  hasPermission,
  MEMBERSHIP_CANCEL_ROUTE,
  membership_table,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { stripe } from "src/utils/helpers/stripe/stripe-client";

export function membershipCancelRoute(app: App) {
  app.post(MEMBERSHIP_CANCEL_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");

      const parsed = await getParsedBody(
        c.req,
        MEMBERSHIP_CANCEL_ROUTE.request
      );
      if (!parsed.success) {
        return c.json(
          MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }
      const { membershipId } = parsed.data;

      const membership = await db.query.membership_table.findFirst({
        where: eq(membership_table.id, membershipId),
      });
      if (!membership) {
        return c.json(
          MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Membership not found" },
          }),
          404
        );
      }

      // permission check - user must have manage_billing in any tenant under this membership
      const roles = await db
        .select({ role: role_table })
        .from(tenant_table)
        .innerJoin(
          account_to_tenant_table,
          eq(account_to_tenant_table.tenant_id, tenant_table.id)
        )
        .innerJoin(
          role_table,
          eq(role_table.id, account_to_tenant_table.role_id)
        )
        .where(
          and(
            eq(tenant_table.membership_id, membershipId),
            eq(account_to_tenant_table.account_id, accountId),
            isNull(tenant_table.deleted_at)
          )
        );
      const hasManage = roles.some((r) =>
        hasPermission(r.role, "manage_billing")
      );
      if (!hasManage) {
        return c.json(
          MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You are not authorized" },
          }),
          403
        );
      }

      if (!membership.subscription_id) {
        return c.json(
          MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "No active subscription" },
          }),
          400
        );
      }

      // If stripe is undefined, it means we might not want it active in the current environment
      if (stripe) {
        await stripe.subscriptions.cancel(membership.subscription_id);
      }

      await db
        .update(membership_table)
        .set({ subscription_id: null })
        .where(eq(membership_table.id, membershipId));

      return c.json(
        MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
          status: "ok",
          payload: { message: "Subscription canceled" },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        MEMBERSHIP_CANCEL_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
