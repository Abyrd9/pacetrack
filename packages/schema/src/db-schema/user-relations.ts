import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { session_table } from "./session";
import { user_table } from "./user";
import { users_to_tenants_table } from "./users-to-tenants";
import { users_to_user_groups_table } from "./users-to-user-groups";

export const user_table_relations = relations(user_table, ({ many }) => ({
	users_to_tenants: many(users_to_tenants_table),
	users_to_teams: many(users_to_user_groups_table),
	accounts: many(account_table),
	sessions: many(session_table),
}));
