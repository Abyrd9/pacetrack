import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, relations, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { tenant_table } from "./tenant";

export type UsersToTenantsState =
	| "invited"
	| "accepted"
	| "rejected"
	| "expired";

export const users_to_tenants_state_enum = pgEnum("users_to_tenants_state", [
	"invited",
	"accepted",
	"rejected",
	"expired",
]);

export const user_invites_table = pgTable("user_invites", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	email: text("email").notNull(),
	tenant_id: text("tenant_id")
		.references(() => tenant_table.id)
		.notNull(),
	state: users_to_tenants_state_enum("state").notNull().default("invited"),
	code: text("code").notNull().unique(),
	expires_at: timestamp("expires_at").notNull(),

	// Generics
	created_at: timestamp().default(sql`now()`),
	updated_at: timestamp("updated_at"),
});

export const user_invites_table_relations = relations(
	user_invites_table,
	({ one }) => ({
		tenant: one(tenant_table, {
			fields: [user_invites_table.tenant_id],
			references: [tenant_table.id],
		}),
	}),
);

export type UserInvites = InferSelectModel<typeof user_invites_table>;
export const UserInvitesSchema = createSelectSchema(user_invites_table);
