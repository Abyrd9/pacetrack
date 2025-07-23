import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { account_table } from "./account";
import { account_group_table } from "./account-group";

export const account_to_account_group_table = pgTable(
	"account_to_account_group",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		account_id: text("account_id")
			.notNull()
			.references(() => account_table.id),
		account_group_id: text("account_group_id")
			.notNull()
			.references(() => account_group_table.id),

		// Generics
		created_at: timestamp().default(sql`now()`),
		deleted_at: timestamp("deleted_at"),
		updated_at: timestamp("updated_at"),
	},
);

export const account_to_account_group_table_relations = relations(
	account_to_account_group_table,
	({ one }) => ({
		account: one(account_table, {
			fields: [account_to_account_group_table.account_id],
			references: [account_table.id],
		}),
		account_group: one(account_group_table, {
			fields: [account_to_account_group_table.account_group_id],
			references: [account_group_table.id],
		}),
	}),
);
