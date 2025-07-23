import { createId } from "@paralleldrive/cuid2";
import { type InferSelectModel, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { user_table } from "./user";

export const tenant_kind_enum = pgEnum("tenant_kind", ["personal", "org"]);

export const tenant_table = pgTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  image_url: text("image_url"),

  kind: tenant_kind_enum("kind").notNull().default("org"),

  deleted_by: text("deleted_by").references(() => user_table.id),
  created_by: text("created_by")
    .references(() => user_table.id)
    .notNull(),

  // Generics
  created_at: timestamp().default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
});

export type Tenant = InferSelectModel<typeof tenant_table>;
export const TenantSchema = createSelectSchema(tenant_table).extend({
  // TODO: Remove this once we have the most up-to-date drizzle-zod package
  kind: z.enum(["personal", "org"]),
});
