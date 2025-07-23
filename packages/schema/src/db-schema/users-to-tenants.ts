import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, relations, sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { role_table } from "./role";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const users_to_tenants_table = pgTable("users_to_tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // References
  user_id: text("user_id")
    .references(() => user_table.id)
    .notNull(),
  tenant_id: text("tenant_id")
    .references(() => tenant_table.id)
    .notNull(),
  role_id: text("role_id")
    .references(() => role_table.id)
    .notNull(),

  // Metadata
  is_primary_contact: boolean("is_primary_contact").notNull().default(false),
  is_billing_contact: boolean("is_billing_contact").notNull().default(false),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
});

export const users_to_tenants_table_relations = relations(
  users_to_tenants_table,
  ({ one }) => ({
    user: one(user_table, {
      fields: [users_to_tenants_table.user_id],
      references: [user_table.id],
    }),
    tenant: one(tenant_table, {
      fields: [users_to_tenants_table.tenant_id],
      references: [tenant_table.id],
    }),
    role: one(role_table, {
      fields: [users_to_tenants_table.role_id],
      references: [role_table.id],
    }),
  })
);

export type UsersToTenants = InferSelectModel<typeof users_to_tenants_table>;
export const UsersToTenantsSchema = createSelectSchema(users_to_tenants_table);
