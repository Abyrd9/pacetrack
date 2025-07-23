import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { account_metadata_table } from "./account-metadata";
import { user_table } from "./user";

export const user_table_relations = relations(user_table, ({ many }) => ({
	accounts: many(account_table),
	account_metadata: many(account_metadata_table),
}));
