import { relations } from "drizzle-orm";
import { role_table } from "./role";
import { users_to_tenants_table } from "./users-to-tenants";

export const role_table_relations = relations(role_table, ({ many }) => ({
  users_to_tenants: many(users_to_tenants_table),
}));
