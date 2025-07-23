import { type AccountGroup, account_group_table } from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { db } from "../../../db";

/**
 * Get all ancestors of a group (walking up the parent chain)
 * @param groupId - The group ID to get ancestors for
 * @returns Array of ancestor groups, from immediate parent to root
 */
export async function getGroupAncestors(
	groupId: string,
): Promise<AccountGroup[]> {
	const ancestors: AccountGroup[] = [];
	let currentId: string | null = groupId;

	while (currentId) {
		const group: AccountGroup | undefined =
			await db.query.account_group_table.findFirst({
				where: eq(account_group_table.id, currentId),
			});

		if (!group || group.deleted_at) {
			break;
		}

		if (group.parent_group_id) {
			const parent: AccountGroup | undefined =
				await db.query.account_group_table.findFirst({
					where: eq(account_group_table.id, group.parent_group_id),
				});

			if (parent && !parent.deleted_at) {
				ancestors.push(parent);
			}

			currentId = group.parent_group_id;
		} else {
			break;
		}
	}

	return ancestors;
}
