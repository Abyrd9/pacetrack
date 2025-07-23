import { createId } from "@paralleldrive/cuid2";
import { sql, type InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { tenant_table } from "./tenant";

export const user_group_table = pgTable("user_groups", {
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

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type UserGroup = InferSelectModel<typeof user_group_table>;
export const UserGroupSchema = createSelectSchema(user_group_table);
