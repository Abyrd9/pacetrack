import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { user_table } from "./user";

export const audit_log_table = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // What changed
  action: text("action", {
    enum: ["create", "update", "delete", "restore"],
  }).notNull(),
  table_name: text("table_name").notNull(),
  record_id: text("record_id").notNull(),

  // What the change was
  old_values: jsonb("old_values"),
  new_values: jsonb("new_values"),

  // Who made the change
  user_id: text("user_id")
    .references(() => user_table.id)
    .notNull(),

  // Additional context
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),

  // Generics
  created_at: timestamp().default(sql`now()`),
});

export type AuditLog = InferSelectModel<typeof audit_log_table>;
export const AuditLogSchema = createSelectSchema(audit_log_table);
