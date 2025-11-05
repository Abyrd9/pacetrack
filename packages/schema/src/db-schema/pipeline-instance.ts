import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { account_table } from "./account";
import { pipeline_template_table } from "./pipeline-template";
import { tenant_table } from "./tenant";

export const pipeline_instance_status_enum = pgEnum(
	"pipeline_instance_status",
	["active", "paused", "completed", "archived"],
);

export const pipeline_instance_table = pgTable("pipeline_instances", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	start_date: timestamp("start_date").notNull(),
	end_date: timestamp("end_date"),

	status: pipeline_instance_status_enum("status").notNull().default("active"),

	// References
	pipeline_template_id: text("pipeline_template_id")
		.notNull()
		.references(() => pipeline_template_table.id),
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
	status_updated_at: timestamp("status_updated_at").default(sql`now()`),
});

export type PipelineInstance = InferSelectModel<typeof pipeline_instance_table>;
export const PipelineInstanceSchema = createSelectSchema(
	pipeline_instance_table,
).extend({
	status: z.enum(["active", "paused", "completed", "archived"]),
});
