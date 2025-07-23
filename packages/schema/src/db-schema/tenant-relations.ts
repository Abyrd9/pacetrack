import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { session_table } from "./session";
import { tenant_table } from "./tenant";
import { user_group_table } from "./user-group";
import { users_to_tenants_table } from "./users-to-tenants";

export const tenant_table_relations = relations(
	tenant_table,
	({ many, one }) => ({
		users_to_tenants: many(users_to_tenants_table),
		account: one(account_table, {
			fields: [tenant_table.account_id],
			references: [account_table.id],
		}),
		user_groups: many(user_group_table),
		sessions: many(session_table),
	}),
);
