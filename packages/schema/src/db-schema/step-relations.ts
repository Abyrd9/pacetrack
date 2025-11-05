import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { pipeline_instance_table } from "./pipeline-instance";
import { step_table } from "./step";
import { step_template_table } from "./step-template";

export const step_table_relations = relations(step_table, ({ one }) => ({
	step_template: one(step_template_table, {
		fields: [step_table.step_template_id],
		references: [step_template_table.id],
	}),
	pipeline_instance: one(pipeline_instance_table, {
		fields: [step_table.pipeline_instance_id],
		references: [pipeline_instance_table.id],
	}),
	creator: one(account_table, {
		fields: [step_table.created_by],
		references: [account_table.id],
	}),
}));
