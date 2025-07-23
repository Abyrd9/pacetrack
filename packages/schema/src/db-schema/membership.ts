import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { user_table } from "./user";

export const membership_table = pgTable("memberships", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),

	// References
	deleted_by: text("deleted_by").references(() => user_table.id),
	created_by: text("created_by")
		.notNull()
		.references(() => user_table.id),

	// Stripe
	customer_id: text("customer_id"),
	subscription_id: text("subscription_id"),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type Membership = InferSelectModel<typeof membership_table>;
export const MembershipSchema = createSelectSchema(membership_table);
