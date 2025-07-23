import {
  DEFAULT_ROLES,
  TENANT_CREATE_ROUTE_PATH,
  TenantCreateRequestSchema,
  account_table,
  hasPermission,
  makeTenantCreateRouteResponse,
  role_table,
  tenant_table,
  users_to_tenants_table,
  type Account,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createFolderForTenant } from "src/utils/helpers/s3";

export function tenantCreateRoute(app: App) {
  app.post(TENANT_CREATE_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");
      const currentSession = c.get("session");
      const parsed = await getParsedBody(c.req, TenantCreateRequestSchema);

      if (!parsed.success) {
        return c.json(
          makeTenantCreateRouteResponse({
            key: TENANT_CREATE_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { name, image_url, account_id } = parsed.data;

      return db.transaction(async (tx) => {
        let accountToUse: Account;

        if (account_id) {
          // User wants to use an existing account - validate they have permission
          const existingAccount = await tx.query.account_table.findFirst({
            where: eq(account_table.id, account_id),
          });

          if (!existingAccount) {
            return c.json(
              makeTenantCreateRouteResponse({
                key: TENANT_CREATE_ROUTE_PATH,
                status: "error",
                errors: { account_id: "Account not found" },
              }),
              404
            );
          }

          // Check if user has manage_billing permission on any tenant under this account
          const permissionRows = await tx
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
                eq(tenant_table.account_id, account_id),
                eq(users_to_tenants_table.user_id, userId),
                isNull(tenant_table.deleted_at)
              )
            );

          const hasManageBilling = permissionRows.some((r) =>
            hasPermission(r.role, "manage_billing")
          );

          if (!hasManageBilling) {
            return c.json(
              makeTenantCreateRouteResponse({
                key: TENANT_CREATE_ROUTE_PATH,
                status: "error",
                errors: {
                  account_id: "You are not authorized to use this account",
                },
              }),
              403
            );
          }

          if (existingAccount.created_by !== userId) {
            return c.json(
              makeTenantCreateRouteResponse({
                key: TENANT_CREATE_ROUTE_PATH,
                status: "error",
                errors: {
                  account_id: "You are not authorized to use this account",
                },
              }),
              403
            );
          }

          accountToUse = existingAccount;
        } else {
          // Create a new account
          const newAccounts = await tx
            .insert(account_table)
            .values({
              created_by: userId,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .returning();

          accountToUse = newAccounts[0];
        }

        const tenant = await tx
          .insert(tenant_table)
          .values({
            name,
            image_url,
            account_id: accountToUse.id,
            created_by: userId,
            kind: "org",
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returning();

        const ownerRole = await tx
          .insert(role_table)
          .values({
            ...DEFAULT_ROLES.OWNER,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returning();

        await tx.insert(users_to_tenants_table).values({
          user_id: userId,
          tenant_id: tenant[0].id,
          role_id: ownerRole[0].id,
          is_primary_contact: true,
          is_billing_contact: true,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        });

        // Update the current session to switch to the new tenant
        await sessions.updateSessionTenant({
          sessionId: currentSession.id,
          tenantId: tenant[0].id,
        });

        await createFolderForTenant(tenant[0].id);

        return c.json(
          makeTenantCreateRouteResponse({
            key: TENANT_CREATE_ROUTE_PATH,
            status: "ok",
            payload: tenant[0],
          }),
          200
        );
      });
    } catch (error) {
      return c.json(
        makeTenantCreateRouteResponse({
          key: TENANT_CREATE_ROUTE_PATH,
          status: "error",
          errors: { global: "Something went wrong" },
        }),
        500
      );
    }
  });
}
