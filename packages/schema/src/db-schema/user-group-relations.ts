import { relations } from "drizzle-orm";
import { tenant_table } from "./tenant";
import { user_group_table } from "./user-group";
import { users_to_user_groups_table } from "./users-to-user-groups";

export const user_group_relations = relations(
	user_group_table,
	({ one, many }) => ({
		tenant: one(tenant_table, {
			fields: [user_group_table.tenant_id],
			references: [tenant_table.id],
		}),
		users_to_user_groups: many(users_to_user_groups_table),
	}),
);
