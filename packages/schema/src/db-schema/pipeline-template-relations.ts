import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { pipeline_instance_table } from "./pipeline-instance";
import { pipeline_template_table } from "./pipeline-template";
import { step_template_table } from "./step-template";
import { tenant_table } from "./tenant";

export const pipeline_template_table_relations = relations(
	pipeline_template_table,
	({ one, many }) => ({
		tenant: one(tenant_table, {
			fields: [pipeline_template_table.tenant_id],
			references: [tenant_table.id],
		}),
		creator: one(account_table, {
			fields: [pipeline_template_table.created_by],
			references: [account_table.id],
		}),
		step_templates: many(step_template_table),
		pipeline_instances: many(pipeline_instance_table),
	}),
);
