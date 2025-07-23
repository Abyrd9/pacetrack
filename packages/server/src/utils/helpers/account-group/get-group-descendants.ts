import { type AccountGroup, account_group_table } from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db";

/**
 * Get all descendants of a group (walking down the hierarchy)
 * @param groupId - The group ID to get descendants for
 * @returns Array of all descendant groups
 */
export async function getGroupDescendants(
	groupId: string,
): Promise<AccountGroup[]> {
	const descendants: AccountGroup[] = [];
	const toProcess: string[] = [groupId];
	const processed = new Set<string>();

	while (toProcess.length > 0) {
		const currentId = toProcess.shift();
		if (!currentId) continue;

		if (processed.has(currentId)) {
			continue; // Avoid infinite loops
		}
		processed.add(currentId);

		// Find all children of this group
		const children = await db.query.account_group_table.findMany({
			where: and(
				eq(account_group_table.parent_group_id, currentId),
				isNull(account_group_table.deleted_at),
			),
		});

		for (const child of children) {
			descendants.push(child);
			toProcess.push(child.id);
		}
	}

	return descendants;
}
