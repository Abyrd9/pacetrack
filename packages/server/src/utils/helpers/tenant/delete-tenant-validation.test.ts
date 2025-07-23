import { describe, expect, test } from "bun:test";
import { account_metadata_table, tenant_table } from "@pacetrack/schema";
import { db } from "src/db";
import { createTestTenant } from "src/utils/test-helpers/create-test-tenant";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { setTestSession } from "src/utils/test-helpers/set-test-session";
import { checkTenantDeletionBlockers } from "./delete-tenant";

describe("Tenant Deletion Validation", () => {
  describe("checkTenantDeletionBlockers", () => {
    test("should block deletion of personal tenant", async () => {
      await resetDb();
      const user = await setTestSession();

      const blockers = await checkTenantDeletionBlockers(user.tenant.id);

      expect(blockers.length).toBeGreaterThan(0);
      const personalTenantBlocker = blockers.find(
        (b) => b.type === "personal_tenant"
      );
      expect(personalTenantBlocker).toBeDefined();
      expect(personalTenantBlocker?.message).toContain("Personal tenant");
    });

    test("should allow deletion of org tenant with one member", async () => {
      await resetDb();
      const user = await setTestSession();

      // Create org tenant (automatically adds user as only member)
      const orgTenant = await createTestTenant(
        user.user.id,
        "Solo Company",
        user.account.id
      );

      const blockers = await checkTenantDeletionBlockers(orgTenant.tenant.id);

      // Should have no blockers (one member is allowed)
      const hasMembersBlocker = blockers.find((b) => b.type === "has_members");
      expect(hasMembersBlocker).toBeUndefined();
    });

    test("should block deletion if tenant has multiple members", async () => {
      await resetDb();

      const owner = await setTestSession(undefined, "owner@test.com");
      const member1 = await setTestSession(undefined, "member1@test.com");
      const member2 = await setTestSession(undefined, "member2@test.com");

      // Create org tenant (automatically adds owner)
      const orgTenant = await createTestTenant(
        owner.user.id,
        "Big Company",
        owner.account.id
      );

      // Add additional members
      await db.insert(account_metadata_table).values([
        {
          user_id: member1.user.id,
          account_id: member1.account.id,
          tenant_id: orgTenant.tenant.id,
          role_id: member1.role.id,
        },
        {
          user_id: member2.user.id,
          account_id: member2.account.id,
          tenant_id: orgTenant.tenant.id,
          role_id: member2.role.id,
        },
      ]);

      const blockers = await checkTenantDeletionBlockers(orgTenant.tenant.id);

      expect(blockers.length).toBeGreaterThan(0);
      const hasMembersBlocker = blockers.find((b) => b.type === "has_members");
      expect(hasMembersBlocker).toBeDefined();
      expect(hasMembersBlocker?.memberCount).toBe(3);
      expect(hasMembersBlocker?.message).toContain("3 members");
    });

    test("should throw error for nonexistent tenant", async () => {
      await resetDb();

      // Should throw an error when tenant doesn't exist
      expect(async () => {
        await checkTenantDeletionBlockers("nonexistent");
      }).toThrow();
    });

    test("should allow deletion of org tenant with no blockers", async () => {
      await resetDb();
      const user = await setTestSession();

      const [tenant] = await db
        .insert(tenant_table)
        .values({
          name: "Clean Company",
          kind: "org",
          created_by: user.user.id,
        })
        .returning();

      // Add only one member
      await db.insert(account_metadata_table).values({
        user_id: user.user.id,
        account_id: user.account.id,
        tenant_id: tenant.id,
        role_id: user.role.id,
      });

      const blockers = await checkTenantDeletionBlockers(tenant.id);

      // Should have no blockers
      expect(blockers.length).toBe(0);
    });
  });
});
