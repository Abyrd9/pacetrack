import { relations } from "drizzle-orm";
import { account_group_table } from "./account-group";
import { account_metadata_table } from "./account-metadata";
import { tenant_table } from "./tenant";

export const tenant_table_relations = relations(tenant_table, ({ many }) => ({
  account_metadata: many(account_metadata_table),
  account_groups: many(account_group_table),
}));
