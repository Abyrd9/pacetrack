import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import type { FieldsDefinition } from "../config-schemas/fields";
import { account_table } from "./account";
import { pipeline_template_table } from "./pipeline-template";
import { step_template_table } from "./step-template";

export const item_template_table = pgTable("item_templates", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),
	version: integer("version").notNull().default(1),

	// References
	pipeline_template_id: text("pipeline_template_id")
		.notNull()
		.references(() => pipeline_template_table.id),
	initial_step_id: text("initial_step_id")
		.notNull()
		.references(() => step_template_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => account_table.id),

	// Field definitions (template-time configuration)
	fields_definition: jsonb("fields_definition")
		.$type<FieldsDefinition>()
		.default(sql`'{}'::jsonb`),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type ItemTemplate = InferSelectModel<typeof item_template_table>;
export const ItemTemplateSchema = createSelectSchema(item_template_table);
