import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

export const user_table = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  password: text("password"),
  display_name: text("display_name"),
  image_url: text("image_url"),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),

  // Reset Password
  reset_password_token: text("reset_password_token"),
  reset_password_expires: timestamp("reset_password_expires"),

  // Change Email
  pending_email: text("pending_email"),
  pending_email_token: text("pending_email_token"),
  pending_email_expires: timestamp("pending_email_expires"),
});

export type User = InferSelectModel<typeof user_table>;
export const UserSchema = createSelectSchema(user_table);
