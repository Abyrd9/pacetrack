import { createId } from "@paralleldrive/cuid2";
import { sql, type InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const session_table = pgTable("sessions", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	user_id: text("user_id")
		.notNull()
		.references(() => user_table.id),
	tenant_id: text("tenant_id")
		.notNull()
		.references(() => tenant_table.id),
	expires_at: timestamp("expires_at").notNull(),

	// Metadata
	ip_address: text("ip_address"),
	user_agent: text("user_agent"),

	// Generics
	created_at: timestamp().default(sql`now()`),
	revoked_at: timestamp("revoked_at"),
	last_activity: timestamp("last_activity"),
});

export type Session = InferSelectModel<typeof session_table>;
export const SessionSchema = createSelectSchema(session_table);
