import { relations } from "drizzle-orm";
import { account_table } from "./account";
import { pipeline_instance_table } from "./pipeline-instance";
import { pipeline_template_table } from "./pipeline-template";
import { step_table } from "./step";
import { tenant_table } from "./tenant";

export const pipeline_instance_table_relations = relations(
	pipeline_instance_table,
	({ one, many }) => ({
		pipeline_template: one(pipeline_template_table, {
			fields: [pipeline_instance_table.pipeline_template_id],
			references: [pipeline_template_table.id],
		}),
		steps: many(step_table),
		tenant: one(tenant_table, {
			fields: [pipeline_instance_table.tenant_id],
			references: [tenant_table.id],
		}),
		creator: one(account_table, {
			fields: [pipeline_instance_table.created_by],
			references: [account_table.id],
		}),
	}),
);
