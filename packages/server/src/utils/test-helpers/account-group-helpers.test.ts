import { beforeAll, describe, expect, test } from "bun:test";
import { account_group_table } from "@pacetrack/schema";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { getGroupAncestors } from "../helpers/account-group/get-group-ancestors";
import { getGroupDescendants } from "../helpers/account-group/get-group-descendants";
import { getGroupTree } from "../helpers/account-group/get-group-tree";
import { resetDb } from "./reset-db";
import { setTestSession } from "./set-test-session";

beforeAll(async () => {
	await resetDb();
});

describe("Account Group Helper Functions", () => {
	test("getGroupTree returns correct hierarchy", async () => {
		const { tenant } = await setTestSession();

		// Create a hierarchy: Root -> Child1, Root -> Child2 -> Grandchild
		const root = await db
			.insert(account_group_table)
			.values({
				name: "Root",
				tenant_id: tenant.id,
				parent_group_id: null,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const child1 = await db
			.insert(account_group_table)
			.values({
				name: "Child1",
				tenant_id: tenant.id,
				parent_group_id: root[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const child2 = await db
			.insert(account_group_table)
			.values({
				name: "Child2",
				tenant_id: tenant.id,
				parent_group_id: root[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const grandchild = await db
			.insert(account_group_table)
			.values({
				name: "Grandchild",
				tenant_id: tenant.id,
				parent_group_id: child2[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const tree = await getGroupTree(tenant.id);

		expect(tree).toHaveLength(1);
		expect(tree[0].id).toBe(root[0].id);
		expect(tree[0].children).toHaveLength(2);

		const treeChild1 = tree[0].children?.find((c) => c.id === child1[0].id);
		expect(treeChild1).toBeDefined();
		expect(treeChild1?.children).toHaveLength(0);

		const treeChild2 = tree[0].children?.find((c) => c.id === child2[0].id);
		expect(treeChild2?.children).toHaveLength(1);
		expect(treeChild2?.children?.[0].id).toBe(grandchild[0].id);
	});

	test("getGroupAncestors returns parent chain", async () => {
		const { tenant } = await setTestSession();

		// Create grandparent -> parent -> child
		const grandparent = await db
			.insert(account_group_table)
			.values({
				name: "Grandparent",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const parent = await db
			.insert(account_group_table)
			.values({
				name: "Parent",
				tenant_id: tenant.id,
				parent_group_id: grandparent[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const child = await db
			.insert(account_group_table)
			.values({
				name: "Child",
				tenant_id: tenant.id,
				parent_group_id: parent[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const ancestors = await getGroupAncestors(child[0].id);

		expect(ancestors).toHaveLength(2);
		expect(ancestors[0].id).toBe(parent[0].id);
		expect(ancestors[1].id).toBe(grandparent[0].id);
	});

	test("getGroupDescendants returns all children recursively", async () => {
		const { tenant } = await setTestSession();

		// Create root -> child1, root -> child2 -> grandchild
		const root = await db
			.insert(account_group_table)
			.values({
				name: "Root",
				tenant_id: tenant.id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const child1 = await db
			.insert(account_group_table)
			.values({
				name: "Child1",
				tenant_id: tenant.id,
				parent_group_id: root[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const child2 = await db
			.insert(account_group_table)
			.values({
				name: "Child2",
				tenant_id: tenant.id,
				parent_group_id: root[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const grandchild = await db
			.insert(account_group_table)
			.values({
				name: "Grandchild",
				tenant_id: tenant.id,
				parent_group_id: child2[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const descendants = await getGroupDescendants(root[0].id);

		expect(descendants).toHaveLength(3);
		const descendantIds = descendants.map((d) => d.id);
		expect(descendantIds).toContain(child1[0].id);
		expect(descendantIds).toContain(child2[0].id);
		expect(descendantIds).toContain(grandchild[0].id);
	});
});
