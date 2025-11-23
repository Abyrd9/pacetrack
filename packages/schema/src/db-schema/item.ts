import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { account_table } from "./account";
import { item_template_table } from "./item-template";
import { pipeline_instance_table } from "./pipeline-instance";
import { step_table } from "./step";

export const item_table = pgTable("items", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),

	// References
	item_template_id: text("item_template_id")
		.notNull()
		.references(() => item_template_table.id),
	pipeline_instance_id: text("pipeline_instance_id")
		.notNull()
		.references(() => pipeline_instance_table.id),
	current_step_id: text("current_step_id")
		.notNull()
		.references(() => step_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => account_table.id),

	// Timestamps
	created_at: timestamp("created_at").default(sql`now()`),
	updated_at: timestamp("updated_at").default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
});

export type Item = InferSelectModel<typeof item_table>;
export const ItemSchema = createSelectSchema(item_table);
