import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { account_table } from "./account";
import { pipeline_instance_table } from "./pipeline-instance";
import { step_template_table } from "./step-template";

export const step_table = pgTable("steps", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),

	// TODO: This will eventually hold actual data instances for this step

	// References
	step_template_id: text("step_template_id")
		.notNull()
		.references(() => step_template_table.id),
	pipeline_instance_id: text("pipeline_instance_id")
		.notNull()
		.references(() => pipeline_instance_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => account_table.id),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type Step = InferSelectModel<typeof step_table>;
export const StepSchema = createSelectSchema(step_table);
