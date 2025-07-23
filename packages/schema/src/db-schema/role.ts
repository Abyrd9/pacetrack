import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

export const role_kind_enum = pgEnum("role_kind", [
	"owner",
	"billing_admin",
	"tenant_admin",
	"member",
	"guest",
]);

export const role_table = pgTable("roles", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	description: text("description"),
	kind: role_kind_enum("kind").notNull(),
	allowed: text("allowed")
		.array()
		.notNull()
		.$type<string[]>()
		.default(sql`ARRAY[]::text[]`),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type Role = InferSelectModel<typeof role_table>;
export const RoleSchema = createSelectSchema(role_table);
