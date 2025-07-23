import { relations } from "drizzle-orm";
import { account_metadata_table } from "./account-metadata";
import { role_table } from "./role";

export const role_table_relations = relations(role_table, ({ many }) => ({
  account_metadata: many(account_metadata_table),
}));
