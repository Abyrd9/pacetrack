import { defineConfig } from "drizzle-kit";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  out: "./drizzle",
  schema: "../schema/src/db-schema",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
