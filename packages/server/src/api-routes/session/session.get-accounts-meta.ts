import {
  type Account,
  account_metadata_table,
  account_table,
  type Role,
  role_table,
  type Tenant,
  tenant_table,
} from "@pacetrack/schema";
import { SESSION_GET_ACCOUNTS_META_ROUTE } from "@pacetrack/schema/src/routes-schema/session/session.get-accounts-meta.types";
import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function sessionGetAccountsMetaRoute(app: App) {
  app.post(SESSION_GET_ACCOUNTS_META_ROUTE.path, async (c) => {
    const session = c.get("session");

    // Get all metadata records for the user with related account, tenant, and role data
    const metadataWithRelations = await db
      .select({
        account: account_table,
        tenant: tenant_table,
        role: role_table,
      })
      .from(account_metadata_table)
      .where(eq(account_metadata_table.user_id, session.user_id))
      .innerJoin(
        account_table,
        eq(account_metadata_table.account_id, account_table.id)
      )
      .innerJoin(
        tenant_table,
        eq(account_metadata_table.tenant_id, tenant_table.id)
      )
      .innerJoin(role_table, eq(account_metadata_table.role_id, role_table.id));

    // Group by account_id and collect tenants/roles for each account
    const accountsMap = new Map<
      string,
      {
        account: InferSelectModel<typeof account_table>;
        tenants: Array<{
          tenant: InferSelectModel<typeof tenant_table>;
          role: InferSelectModel<typeof role_table>;
        }>;
      }
    >();

    for (const meta of metadataWithRelations) {
      if (!meta.account || !meta.tenant || !meta.role) {
        throw new Error("Account, tenant, or role not found in metadata");
      }

      const account = meta.account as InferSelectModel<typeof account_table>;
      const tenant = meta.tenant as InferSelectModel<typeof tenant_table>;
      const role = meta.role as InferSelectModel<typeof role_table>;
      const accountId = account.id;
      const existingAccount = accountsMap.get(accountId);
      if (!existingAccount) {
        accountsMap.set(accountId, {
          account,
          tenants: [{ tenant, role }],
        });
      } else {
        existingAccount.tenants.push({
          tenant,
          role,
        });
      }
    }

    const all = Array.from(accountsMap.values());

    // For session, we might want to filter to active accounts, but for now return all
    const sessionAccounts = session.active_accounts.reduce(
      (acc, metadata) => {
        const account = metadataWithRelations.find(
          (m) => m.account.id === metadata.account_id
        )?.account;
        if (!account) return acc;

        if (!acc.has(metadata.account_id)) {
          acc.set(account.id, {
            account,
            tenants: [],
          });
        }

        const tenant = metadataWithRelations.find(
          (m) => m.tenant.id === metadata.tenant_id
        )?.tenant;
        if (!tenant) return acc;

        const role = metadataWithRelations.find(
          (m) => m.role.id === metadata.role_id
        )?.role;
        if (!role) return acc;

        acc.get(account.id)?.tenants.push({
          tenant,
          role,
        });

        return acc;
      },
      new Map<
        string,
        {
          account: Account;
          tenants: Array<{
            tenant: Tenant;
            role: Role;
          }>;
        }
      >()
    );

    return c.json(
      SESSION_GET_ACCOUNTS_META_ROUTE.createRouteResponse({
        status: "ok",
        payload: { session: Array.from(sessionAccounts.values()), all },
      }),
      200
    );
  });
}
