import {
	account_group_table,
	account_to_account_group_table,
} from "@pacetrack/schema";
import { db } from "src/db";

export async function createTestAccountGroup(
	tenant_id: string,
	account_id: string,
	name = "Test Account Group",
) {
	const [accountGroup] = await db
		.insert(account_group_table)
		.values({
			name,
			description: "Test Description",
			tenant_id,
		})
		.returning();

	await db.insert(account_to_account_group_table).values({
		account_id,
		account_group_id: accountGroup.id,
	});

	return accountGroup;
}
