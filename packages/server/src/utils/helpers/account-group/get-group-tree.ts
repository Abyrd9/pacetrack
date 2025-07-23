import { type AccountGroup, account_group_table } from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db";

export type AccountGroupWithChildren = AccountGroup & {
	children?: AccountGroupWithChildren[];
};

/**
 * Get all account groups for a tenant organized as a tree structure
 * @param tenantId - The tenant ID to fetch groups for
 * @returns Tree structure of account groups
 */
export async function getGroupTree(
	tenantId: string,
): Promise<AccountGroupWithChildren[]> {
	// Fetch all groups for this tenant
	const groups = await db.query.account_group_table.findMany({
		where: and(
			eq(account_group_table.tenant_id, tenantId),
			isNull(account_group_table.deleted_at),
		),
	});

	// Build a map for quick lookups
	const groupMap = new Map<string, AccountGroupWithChildren>();
	for (const group of groups) {
		groupMap.set(group.id, { ...group, children: [] });
	}

	// Build the tree structure
	const rootGroups: AccountGroupWithChildren[] = [];

	for (const group of groups) {
		const groupWithChildren = groupMap.get(group.id);
		if (!groupWithChildren) continue;

		if (group.parent_group_id) {
			// This is a child group - add it to its parent's children
			const parent = groupMap.get(group.parent_group_id);
			if (parent?.children) {
				parent.children.push(groupWithChildren);
			} else {
				// Parent doesn't exist or is deleted, treat as root
				rootGroups.push(groupWithChildren);
			}
		} else {
			// This is a root group (no parent)
			rootGroups.push(groupWithChildren);
		}
	}

	return rootGroups;
}
