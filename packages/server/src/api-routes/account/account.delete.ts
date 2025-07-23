import {
  ACCOUNT_DELETE_ROUTE,
  account_metadata_table,
  hasPermission,
  role_table,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { removeAccountFromTenant } from "src/utils/helpers/account/delete-account";
import { canRemoveAccountFromTenant } from "src/utils/helpers/account/delete-account-validation";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function accountDeleteRoute(app: App) {
  app.post(ACCOUNT_DELETE_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");
      const tenantId = c.get("tenant_id");
      const userId = c.get("user_id");

      const parsed = await getParsedBody(c.req, ACCOUNT_DELETE_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          ACCOUNT_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const targetAccountId = parsed.data.accountId;
      const targetTenantId = parsed.data.tenantId;

      // Get the tenant to check if it's personal
      const tenant = await db.query.tenant_table.findFirst({
        where: and(
          eq(tenant_table.id, targetTenantId),
          isNull(tenant_table.deleted_at)
        ),
      });

      if (!tenant) {
        return c.json(
          ACCOUNT_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Tenant not found" },
          }),
          404
        );
      }

      // Cannot remove accounts from personal tenants
      if (tenant.kind === "personal") {
        return c.json(
          ACCOUNT_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global:
                "Cannot remove accounts from personal tenants. To delete your account, use the user deletion feature.",
            },
          }),
          400
        );
      }

      // Check if user is trying to remove themselves or another account
      const isSelfRemoval = accountId === targetAccountId;

      // Check permission of current account (if not self-removal, need manage_accounts permission)
      if (!isSelfRemoval) {
        const roleResp = await db
          .select({ role: role_table })
          .from(account_metadata_table)
          .innerJoin(
            role_table,
            eq(role_table.id, account_metadata_table.role_id)
          )
          .where(
            and(
              eq(account_metadata_table.account_id, accountId),
              eq(account_metadata_table.tenant_id, tenantId),
              isNull(account_metadata_table.deleted_at)
            )
          );

        const role = roleResp[0]?.role;
        if (!role || !hasPermission(role, "manage_accounts")) {
          return c.json(
            ACCOUNT_DELETE_ROUTE.createRouteResponse({
              status: "error",
              errors: {
                global: "You are not authorized to remove other accounts",
              },
            }),
            403
          );
        }
      }

      // Check if removal is allowed (validates sole owner, billing owner, etc.)
      const canRemove = await canRemoveAccountFromTenant(
        targetAccountId,
        tenantId,
        accountId
      );

      if (!canRemove.allowed) {
        return c.json(
          ACCOUNT_DELETE_ROUTE.createRouteResponse({
            status: "error",
            errors: {
              global: canRemove.reason || "Cannot remove account from tenant",
            },
          }),
          400
        );
      }

      // Remove the account from this tenant
      await removeAccountFromTenant(
        targetAccountId,
        tenantId,
        userId,
        isSelfRemoval // Pass whether this was voluntary
      );

      return c.json(
        ACCOUNT_DELETE_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            message: isSelfRemoval
              ? "You have left the tenant"
              : "Account removed from tenant",
          },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_DELETE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
