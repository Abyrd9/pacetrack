import {
  ACCOUNT_PORTAL_LINK_ROUTE_PATH,
  AccountPortalLinkRequestSchema,
  account_table,
  hasPermission,
  makeAccountPortalLinkRouteResponse,
  role_table,
  tenant_table,
  users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getOriginUrl } from "src/utils/helpers/domain-url";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { stripe } from "src/utils/helpers/stripe";

export function accountPortalLinkRoute(app: App) {
  app.post(ACCOUNT_PORTAL_LINK_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, AccountPortalLinkRequestSchema);
      if (!parsed.success) {
        return c.json(
          makeAccountPortalLinkRouteResponse({
            key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
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
          makeAccountPortalLinkRouteResponse({
            key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "Account not found" },
          }),
          404
        );
      }

      // Check permission manage_billing in any tenant under this account
      const rows = await db
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
      const hasManage = rows.some((r) =>
        hasPermission(r.role, "manage_billing")
      );
      if (!hasManage) {
        return c.json(
          makeAccountPortalLinkRouteResponse({
            key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "You are not authorized" },
          }),
          403
        );
      }

      if (!account.customer_id) {
        return c.json(
          makeAccountPortalLinkRouteResponse({
            key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "Account has no Stripe customer" },
          }),
          400
        );
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: account.customer_id,
        return_url: `${getOriginUrl(c.req)}/dashboard/billing`,
      });

      return c.json(
        makeAccountPortalLinkRouteResponse({
          key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
          status: "ok",
          payload: { url: portal.url },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeAccountPortalLinkRouteResponse({
          key: ACCOUNT_PORTAL_LINK_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
