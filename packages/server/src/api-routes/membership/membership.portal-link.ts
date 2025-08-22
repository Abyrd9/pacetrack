import {
  account_to_tenant_table,
  hasPermission,
  MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
  MembershipPortalLinkRequestSchema,
  makeMembershipPortalLinkRouteResponse,
  membership_table,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getOriginUrl } from "src/utils/helpers/domain-url";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { stripe } from "src/utils/helpers/stripe";

export function membershipPortalLinkRoute(app: App) {
  app.post(MEMBERSHIP_PORTAL_LINK_ROUTE_PATH, async (c) => {
    try {
      const accountId = c.get("account_id");

      const parsed = await getParsedBody(
        c.req,
        MembershipPortalLinkRequestSchema
      );
      if (!parsed.success) {
        return c.json(
          makeMembershipPortalLinkRouteResponse({
            key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
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
          makeMembershipPortalLinkRouteResponse({
            key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "Membership not found" },
          }),
          404
        );
      }

      // Check permission manage_billing in any tenant under this membership
      const rows = await db
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
      const hasManage = rows.some((r) =>
        hasPermission(r.role, "manage_billing")
      );
      if (!hasManage) {
        return c.json(
          makeMembershipPortalLinkRouteResponse({
            key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "You are not authorized" },
          }),
          403
        );
      }

      if (!membership.customer_id) {
        return c.json(
          makeMembershipPortalLinkRouteResponse({
            key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "Membership has no Stripe customer" },
          }),
          400
        );
      }

      if (!stripe) {
        return c.json(
          makeMembershipPortalLinkRouteResponse({
            key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
            status: "error",
            errors: { global: "Stripe is not enabled" },
          }),
          400
        );
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: membership.customer_id,
        return_url: `${getOriginUrl(c.req)}/dashboard/billing`,
      });

      return c.json(
        makeMembershipPortalLinkRouteResponse({
          key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
          status: "ok",
          payload: { url: portal.url },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeMembershipPortalLinkRouteResponse({
          key: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
