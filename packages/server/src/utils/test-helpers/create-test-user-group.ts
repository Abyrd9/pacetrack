import {
	user_group_table,
	users_to_user_groups_table,
} from "@pacetrack/schema";
import { db } from "src/db";
import { v4 } from "uuid";

export async function createTestUserGroup(
	tenant_id: string,
	user_id: string,
	name = "Test User Group",
) {
	const [userGroup] = await db
		.insert(user_group_table)
		.values({
			id: v4(),
			name,
			description: "Test Description",
			tenant_id,
			image_url: null,
			created_at: new Date(),
			updated_at: new Date(),
		})
		.returning();

	await db.insert(users_to_user_groups_table).values({
		user_id,
		user_group_id: userGroup.id,
	});

	return userGroup;
}
