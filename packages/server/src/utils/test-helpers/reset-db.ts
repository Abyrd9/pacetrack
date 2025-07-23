import { DEFAULT_ROLES, role_table } from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { db } from "src/db";

export const resetDb = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Resetting the database is only allowed in test mode");
  }

  console.log("🗑️ Emptying the entire database");

  try {
    // Disable foreign key checks temporarily for PostgreSQL
    await db.execute(sql`SET session_replication_role = 'replica';`);

    // Dynamically get all tables and their dependencies
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

    if (result.rows.length > 0) {
      // First truncate all tables with CASCADE to handle dependencies
      for (const row of result.rows) {
        const tableName = row.table_name;
        // console.log(`Truncating table: ${tableName}`);
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE;`));
      }
    } else {
      console.log("No tables found to truncate");
    }

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin';`);

    console.log("✅ Database emptied");
    console.log("🌱 Seeding default roles");
    await db.insert(role_table).values(Object.values(DEFAULT_ROLES));
    console.log("✅ Default roles seeded");
  } catch (error) {
    console.error("❌ Error emptying database:", error);

    // Make sure foreign key checks are re-enabled even if there's an error
    await db.execute(sql`SET session_replication_role = 'origin';`);

    throw error;
  }
};
