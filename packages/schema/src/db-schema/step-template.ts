import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { account_table } from "./account";
import { pipeline_template_table } from "./pipeline-template";

export const step_template_table = pgTable("step_templates", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),
	version: integer("version").notNull().default(1),
	order: integer("order").notNull(),
	target_duration_days: integer("target_duration_days"),
	color: text("color"),
	icon: text("icon"),
	iconColor: text("icon_color"),

	// References
	pipeline_template_id: text("pipeline_template_id")
		.notNull()
		.references(() => pipeline_template_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => account_table.id),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type StepTemplate = InferSelectModel<typeof step_template_table>;
export const StepTemplateSchema = createSelectSchema(step_template_table);
