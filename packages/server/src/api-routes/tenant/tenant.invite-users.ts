import {
  account_metadata_table,
  hasPermission,
  role_table,
  TENANT_INVITE_USERS_ROUTE,
  tenant_table,
  user_invites_table,
} from "@pacetrack/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function tenantInviteUsersRoute(app: App) {
  app.post(TENANT_INVITE_USERS_ROUTE.path, async (c) => {
    try {
      const accountId = c.get("account_id");

      const parsed = await getParsedBody(
        c.req,
        TENANT_INVITE_USERS_ROUTE.request
      );

      if (!parsed.success) {
        return c.json(
          TENANT_INVITE_USERS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Invalid request" },
          }),
          400
        );
      }

      // Let's make sure this tenant isn't a personal tenant
      const tenant = await db.query.tenant_table.findFirst({
        where: eq(tenant_table.id, parsed.data.tenantId),
      });

      if (tenant?.kind === "personal") {
        return c.json(
          TENANT_INVITE_USERS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You cannot invite users to a personal tenant" },
          }),
          400
        );
      }

      if (!tenant) {
        return c.json(
          TENANT_INVITE_USERS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Tenant not found" },
          }),
          400
        );
      }

      const usersToTenantsResponse = await db
        .select({
          userTenant: account_metadata_table,
          role: role_table,
        })
        .from(account_metadata_table)
        .leftJoin(role_table, eq(role_table.id, account_metadata_table.role_id))
        .where(
          and(
            eq(account_metadata_table.account_id, accountId),
            eq(account_metadata_table.tenant_id, parsed.data.tenantId)
          )
        );

      const role = usersToTenantsResponse[0]?.role;

      if (!role || !hasPermission(role, "manage_users")) {
        return c.json(
          TENANT_INVITE_USERS_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You are not authorized to invite users" },
          }),
          403
        );
      }

      // Create user invite columns for each email
      await db.transaction(async (tx) => {
        for (const email of parsed.data.emails) {
          // Check if there's an existing invite for this email and tenant
          const existingInvite = await tx
            .select()
            .from(user_invites_table)
            .where(
              and(
                eq(user_invites_table.email, email),
                eq(user_invites_table.tenant_id, parsed.data.tenantId)
              )
            )
            .limit(1);

          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          const expiresAt = new Date(Date.now() + TWENTY_FOUR_HOURS);

          if (existingInvite.length > 0) {
            // Update existing invite
            await tx
              .update(user_invites_table)
              .set({
                state: "invited",
                code: createId(), // Generate new code
                expires_at: expiresAt,
                updated_at: sql`now()`,
              })
              .where(eq(user_invites_table.id, existingInvite[0].id));
          } else {
            // Create new invite
            await tx.insert(user_invites_table).values({
              email,
              tenant_id: parsed.data.tenantId,
              state: "invited",
              code: createId(),
              expires_at: expiresAt,
            });
          }
        }

        // TODO: Send emails to the invited users
      });

      return c.json(
        TENANT_INVITE_USERS_ROUTE.createRouteResponse({
          status: "ok",
          payload: {
            message: "Users invited successfully",
          },
        }),
        200
      );
    } catch (error) {
      return c.json(
        TENANT_INVITE_USERS_ROUTE.createRouteResponse({
          status: "error",
          errors: {
            global: "Invalid request",
          },
        }),
        400
      );
    }
  });
}
