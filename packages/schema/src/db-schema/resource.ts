import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { tenant_table } from "./tenant";
import { user_table } from "./user";

export const resource_table = pgTable("resources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  url: text("url").notNull(),
  type: text("type", {
    enum: ["image", "video", "document", "html", "other"],
  }).notNull(),

  // References
  tenant_id: text("tenant_id")
    .references(() => tenant_table.id)
    .notNull(),
  created_by_id: text("created_by_id")
    .references(() => user_table.id)
    .notNull(),
  deleted_by_id: text("deleted_by_id").references(() => user_table.id),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
});

export type Resource = InferSelectModel<typeof resource_table>;
export const ResourceSchema = createSelectSchema(resource_table);
