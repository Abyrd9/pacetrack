import { relations } from "drizzle-orm";
import { resource_table } from "./resource";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const resource_relations = relations(resource_table, ({ one }) => ({
  tenant: one(tenant_table, {
    fields: [resource_table.tenant_id],
    references: [tenant_table.id],
  }),
  created_by: one(user_table, {
    fields: [resource_table.created_by_id],
    references: [user_table.id],
  }),
  deleted_by: one(user_table, {
    fields: [resource_table.deleted_by_id],
    references: [user_table.id],
  }),
}));
