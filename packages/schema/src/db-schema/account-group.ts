import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { tenant_table } from "./tenant";

export const account_group_table = pgTable("account_groups", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),
	image_url: text("image_url"),

	// References
	tenant_id: text("tenant_id")
		.notNull()
		.references(() => tenant_table.id),
	parent_group_id: text("parent_group_id"),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type AccountGroup = InferSelectModel<typeof account_group_table>;
export const AccountGroupSchema = createSelectSchema(account_group_table);
