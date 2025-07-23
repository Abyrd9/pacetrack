import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

export const user_table = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
});

export type User = InferSelectModel<typeof user_table>;
export const UserSchema = createSelectSchema(user_table);
