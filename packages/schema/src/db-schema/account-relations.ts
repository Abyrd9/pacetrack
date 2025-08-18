import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { account_to_tenant_table } from "./account-to-tenant";
import { user_table } from "./user";

export const account_table_relations = relations(
	account_table,
	({ one, many }) => ({
		tenants: many(account_to_tenant_table),
		user: one(user_table, {
			fields: [account_table.user_id],
			references: [user_table.id],
		}),
	}),
);
