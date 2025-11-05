import {
	account_group_relations,
	account_group_table,
	account_metadata_table,
	account_metadata_table_relations,
	account_table,
	account_table_relations,
	account_to_account_group_table,
	account_to_account_group_table_relations,
	pipeline_instance_table,
	pipeline_instance_table_relations,
	pipeline_template_table,
	pipeline_template_table_relations,
	role_table,
	role_table_relations,
	step_table,
	step_table_relations,
	step_template_table,
	step_template_table_relations,
	tenant_table,
	tenant_table_relations,
	user_invites_table,
	user_invites_table_relations,
	user_table,
	user_table_relations,
} from "@pacetrack/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

function getDatabaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	throw new Error("DATABASE_URL is not set");
}

// Create a PostgreSQL pool
const pool = new Pool({
	connectionString: getDatabaseUrl(),
});

const schema = {
	account_group_relations,
	account_group_table,
	account_metadata_table,
	account_metadata_table_relations,
	account_table,
	account_table_relations,
	account_to_account_group_table,
	account_to_account_group_table_relations,
	pipeline_instance_table,
	pipeline_instance_table_relations,
	pipeline_template_table,
	pipeline_template_table_relations,
	role_table,
	role_table_relations,
	step_table,
	step_table_relations,
	step_template_table,
	step_template_table_relations,
	tenant_table,
	tenant_table_relations,
	user_invites_table,
	user_invites_table_relations,
	user_table,
	user_table_relations,
};

// Initialize Drizzle with the pool
export const db = drizzle(pool, {
	schema,
});

function migrateDbOnStart() {
	console.log("Migrating database");
	migrate(db, { migrationsFolder: "./drizzle" })
		.catch((error) => {
			console.error("Error migrating database", error);
		})
		.then(() => {
			console.log("Database migrated successfully");
		})
		.finally(() => {
			console.log("Database migration completed");
		});
}

migrateDbOnStart();

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type SchemaTables = (typeof schema)[keyof typeof schema];
