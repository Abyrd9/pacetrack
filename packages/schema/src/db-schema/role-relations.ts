import { relations } from "drizzle-orm";
import { account_to_tenant_table } from "./account-to-tenant";
import { role_table } from "./role";

export const role_table_relations = relations(role_table, ({ many }) => ({
	account_to_tenant: many(account_to_tenant_table),
}));
