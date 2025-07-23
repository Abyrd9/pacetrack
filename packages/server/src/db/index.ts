import {
	account_group_relations,
	account_group_table,
	account_table,
	account_table_relations,
	account_to_account_group_table,
	account_to_account_group_table_relations,
	account_to_tenant_table,
	membership_table,
	membership_table_relations,
	role_table,
	role_table_relations,
	tenant_table,
	tenant_table_relations,
	user_invites_table,
	user_invites_table_relations,
	user_table,
	user_table_relations,
} from "@pacetrack/schema";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!Bun.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

// Create a PostgreSQL pool
const pool = new Pool({
	connectionString: Bun.env.DATABASE_URL,
});

const schema = {
	account_table,
	account_table_relations,
	account_to_tenant_table,
	account_group_table,
	account_group_relations,
	account_to_account_group_table,
	account_to_account_group_table_relations,
	role_table,
	role_table_relations,
	membership_table,
	membership_table_relations,
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

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type SchemaTables = (typeof schema)[keyof typeof schema];
