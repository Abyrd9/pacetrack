import { relations } from "drizzle-orm";
import { membership_table } from "./membership";
import { tenant_table } from "./tenant";

export const membership_table_relations = relations(
	membership_table,
	({ many }) => ({
		tenants: many(tenant_table),
	}),
);
