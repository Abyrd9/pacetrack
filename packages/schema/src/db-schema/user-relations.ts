import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { account_to_account_group_table } from "./account-to-account-group";
import { user_table } from "./user";

export const user_table_relations = relations(user_table, ({ many }) => ({
	accounts: many(account_table),
	account_groups: many(account_to_account_group_table),
}));
