import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { item_table } from "./item";
import { item_template_table } from "./item-template";
import { pipeline_instance_table } from "./pipeline-instance";
import { step_table } from "./step";

export const item_relations = relations(item_table, ({ one }) => ({
	item_template: one(item_template_table, {
		fields: [item_table.item_template_id],
		references: [item_template_table.id],
	}),
	pipeline_instance: one(pipeline_instance_table, {
		fields: [item_table.pipeline_instance_id],
		references: [pipeline_instance_table.id],
	}),
	current_step: one(step_table, {
		fields: [item_table.current_step_id],
		references: [step_table.id],
	}),
	creator: one(account_table, {
		fields: [item_table.created_by],
		references: [account_table.id],
	}),
}));
