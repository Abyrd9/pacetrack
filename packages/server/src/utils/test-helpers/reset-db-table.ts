import { getTableName, sql } from "drizzle-orm";
import type { PgTable, TableConfig } from "drizzle-orm/pg-core";
import { db } from "src/db";

export const resetDbTable = async (table: PgTable<TableConfig>) => {
  const name = getTableName(table);
  await db.execute(sql.raw(`TRUNCATE TABLE "${name}" CASCADE;`));
};
