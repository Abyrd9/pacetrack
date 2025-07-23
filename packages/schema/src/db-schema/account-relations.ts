import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { account_metadata_table } from "./account-metadata";
import { user_table } from "./user";

export const account_table_relations = relations(
  account_table,
  ({ one, many }) => ({
    account_metadata: many(account_metadata_table),
    user: one(user_table, {
      fields: [account_table.user_id],
      references: [user_table.id],
    }),
  })
);
