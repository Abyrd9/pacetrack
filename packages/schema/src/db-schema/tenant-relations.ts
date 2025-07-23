import { relations } from "drizzle-orm";
import { account_group_table } from "./account-group";
import { account_metadata_table } from "./account-metadata";
import { membership_table } from "./membership";
import { tenant_table } from "./tenant";

export const tenant_table_relations = relations(
  tenant_table,
  ({ many, one }) => ({
    account_metadata: many(account_metadata_table),
    account_groups: many(account_group_table),
    membership: one(membership_table, {
      fields: [tenant_table.membership_id],
      references: [membership_table.id],
    }),
  })
);
