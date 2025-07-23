import {
  account_group_table,
  account_metadata_table,
  account_table,
  account_to_account_group_table,
  membership_table,
  role_table,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { reset } from "drizzle-seed";
import { db } from "../src/db";

async function main() {
  console.log("🌱 Starting database seeding...");

  // Optional: Reset the database first (uncomment if you want to clear existing data)
  console.log("🗑️  Resetting database...");
  await reset(db, {
    user_table,
    account_table,
    membership_table,
    tenant_table,
    role_table,
    account_metadata_table,
    account_group_table,
    account_to_account_group_table,
  });
  console.log("✅ Database reset complete");
}

main().catch((error) => {
  console.error("❌ Error cleaning database:", error);
  process.exit(1);
});
