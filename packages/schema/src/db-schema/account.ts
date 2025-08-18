import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { user_table } from "./user";

export const account_table = pgTable("accounts", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	email: text("email").unique().notNull(),
	password: text("password"),
	image_url: text("image_url"),
	display_name: text("display_name"),

	// Reset Password
	reset_password_token: text("reset_password_token"),
	reset_password_expires: timestamp("reset_password_expires"),

	// Change Email
	pending_email: text("pending_email"),
	pending_email_token: text("pending_email_token"),
	pending_email_expires: timestamp("pending_email_expires"),

	// References
	user_id: text("user_id")
		.references(() => user_table.id)
		.notNull(),

	// Generics
	created_at: timestamp().default(sql`now()`),
	deleted_at: timestamp("deleted_at"),
	updated_at: timestamp("updated_at"),
});

export type Account = InferSelectModel<typeof account_table>;
export const AccountSchema = createSelectSchema(account_table);
