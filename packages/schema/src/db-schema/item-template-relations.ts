import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { item_template_table } from "./item-template";
import { pipeline_template_table } from "./pipeline-template";
import { step_template_table } from "./step-template";

export const item_template_table_relations = relations(
	item_template_table,
	({ one }) => ({
		pipeline_template: one(pipeline_template_table, {
			fields: [item_template_table.pipeline_template_id],
			references: [pipeline_template_table.id],
		}),
		initial_step: one(step_template_table, {
			fields: [item_template_table.initial_step_id],
			references: [step_template_table.id],
		}),
		creator: one(account_table, {
			fields: [item_template_table.created_by],
			references: [account_table.id],
		}),
	}),
);
