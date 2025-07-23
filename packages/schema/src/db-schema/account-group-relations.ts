import { relations } from "drizzle-orm";
import { account_group_table } from "./account-group";
import { account_to_account_group_table } from "./account-to-account-group";
import { tenant_table } from "./tenant";

export const account_group_relations = relations(
	account_group_table,
	({ one, many }) => ({
		tenant: one(tenant_table, {
			fields: [account_group_table.tenant_id],
			references: [tenant_table.id],
		}),
		account_to_account_group: many(account_to_account_group_table),
		parent: one(account_group_table, {
			fields: [account_group_table.parent_group_id],
			references: [account_group_table.id],
			relationName: "group_hierarchy",
		}),
		children: many(account_group_table, {
			relationName: "group_hierarchy",
		}),
	}),
);
