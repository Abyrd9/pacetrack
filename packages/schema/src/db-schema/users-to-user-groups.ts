import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user_table } from "./user";
import { user_group_table } from "./user-group";

export const users_to_user_groups_table = pgTable("users_to_user_groups", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	user_id: text("user_id")
		.notNull()
		.references(() => user_table.id),
	user_group_id: text("user_group_id")
		.notNull()
		.references(() => user_group_table.id),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export const users_to_user_groups_table_relations = relations(
	users_to_user_groups_table,
	({ one }) => ({
		user: one(user_table, {
			fields: [users_to_user_groups_table.user_id],
			references: [user_table.id],
		}),
		user_group: one(user_group_table, {
			fields: [users_to_user_groups_table.user_group_id],
			references: [user_group_table.id],
		}),
	}),
);
