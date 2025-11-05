import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { account_table } from "./account";
import { tenant_table } from "./tenant";

export const pipeline_template_status_enum = pgEnum(
	"pipeline_template_status",
	["draft", "active", "archived"],
);

export const pipeline_template_table = pgTable("pipeline_templates", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),
	version: integer("version").notNull().default(1),
	status: pipeline_template_status_enum("status").notNull().default("draft"),
	icon: text("icon"),
	iconColor: text("icon_color"),

	// References
	tenant_id: text("tenant_id")
		.notNull()
		.references(() => tenant_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => account_table.id),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type PipelineTemplate = InferSelectModel<typeof pipeline_template_table>;
export const PipelineTemplateSchema = createSelectSchema(
	pipeline_template_table,
).extend({
	status: z.enum(["draft", "active", "archived"]),
});
