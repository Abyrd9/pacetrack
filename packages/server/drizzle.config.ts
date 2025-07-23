import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!Bun.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  out: "./drizzle",
  schema: "../schema/src/db-schema",
  dialect: "postgresql",
  dbCredentials: {
    url: Bun.env.DATABASE_URL,
  },
});
