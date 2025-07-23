import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const account_table_relations = relations(
  account_table,
  ({ many, one }) => ({
    tenants: many(tenant_table),
    created_by: one(user_table, {
      fields: [account_table.created_by],
      references: [user_table.id],
    }),
  })
);
