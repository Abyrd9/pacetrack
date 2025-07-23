import { type AccountGroup, account_group_table } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { db } from "../../../db";

/**
 * Check if moving a group to a new parent would create a cycle
 * @param groupId - The group being moved
 * @param newParentId - The proposed new parent
 * @returns true if a cycle would be created, false otherwise
 */
export async function wouldCreateCycle(
	groupId: string,
	newParentId: string | null | undefined,
): Promise<boolean> {
	if (!newParentId) {
		return false; // Moving to root level is always safe
	}

	if (groupId === newParentId) {
		return true; // Self-reference is a cycle
	}

	// Walk up the parent chain from newParentId to see if we encounter groupId
	let currentId: string | null = newParentId;
	const visited = new Set<string>();

	while (currentId) {
		if (visited.has(currentId)) {
			// Already visited this node, there's a cycle in the existing data
			return true;
		}

		if (currentId === groupId) {
			// We've found groupId in the parent chain - this would create a cycle
			return true;
		}

		visited.add(currentId);

		// Get the parent of the current node
		const group: AccountGroup | undefined =
			await db.query.account_group_table.findFirst({
				where: eq(account_group_table.id, currentId),
			});

		if (!group) {
			// Parent doesn't exist, stop here
			break;
		}

		currentId = group.parent_group_id;
	}

	return false;
}
