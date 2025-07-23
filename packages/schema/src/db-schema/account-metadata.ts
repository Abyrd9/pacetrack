import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { account_table } from "./account";
import { role_table } from "./role";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const account_metadata_table = pgTable("account_metadata", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // References
  user_id: text("user_id")
    .references(() => user_table.id)
    .notNull(),
  account_id: text("account_id")
    .references(() => account_table.id)
    .notNull(),
  tenant_id: text("tenant_id")
    .references(() => tenant_table.id)
    .notNull(),
  role_id: text("role_id")
    .references(() => role_table.id)
    .notNull(),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
});

export const account_metadata_table_relations = relations(
  account_metadata_table,
  ({ one }) => ({
    user: one(user_table, {
      fields: [account_metadata_table.user_id],
      references: [user_table.id],
    }),
    account: one(account_table, {
      fields: [account_metadata_table.account_id],
      references: [account_table.id],
    }),
    tenant: one(tenant_table, {
      fields: [account_metadata_table.tenant_id],
      references: [tenant_table.id],
    }),
    role: one(role_table, {
      fields: [account_metadata_table.role_id],
      references: [role_table.id],
    }),
  })
);

export type AccountMetadata = InferSelectModel<typeof account_metadata_table>;
export const AccountMetadataSchema = createSelectSchema(account_metadata_table);
