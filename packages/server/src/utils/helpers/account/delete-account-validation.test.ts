import { describe, expect, test } from "bun:test";
import {
  account_metadata_table,
  account_table,
  role_table,
} from "@pacetrack/schema";
import { db } from "src/db";
import { createTestTenant } from "src/utils/test-helpers/create-test-tenant";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { setTestSession } from "src/utils/test-helpers/set-test-session";
import {
  canRemoveAccountFromTenant,
  checkAccountDeletionBlockers,
  checkUserDeletionBlockers,
} from "./delete-account-validation";

describe("Account Deletion Validation", () => {
  describe("checkAccountDeletionBlockers", () => {
    test("should block deletion if account is sole owner of org tenant", async () => {
      await resetDb();
      const user = await setTestSession();

      // Create second account so we don't hit "last_account" blocker
      await db.insert(account_table).values({
        user_id: user.user.id,
        email: "second@test.com",
        password: await Bun.password.hash("password"),
      });

      // Create org tenant (automatically adds account to tenant as owner)
      const orgTenant = await createTestTenant(
        user.user.id,
        "Company",
        user.account.id
      );

      const blockers = await checkAccountDeletionBlockers(
        user.account.id,
        user.user.id
      );

      expect(blockers.length).toBeGreaterThan(0);
      const soleOwnerBlocker = blockers.find((b) => b.type === "sole_owner");
      expect(soleOwnerBlocker).toBeDefined();
      expect(soleOwnerBlocker?.tenantName).toBe("Company");
    });

    test("should block deletion if account is last account for user", async () => {
      await resetDb();
      const user = await setTestSession();

      const blockers = await checkAccountDeletionBlockers(
        user.account.id,
        user.user.id
      );

      expect(blockers.length).toBeGreaterThan(0);
      const lastAccountBlocker = blockers.find(
        (b) => b.type === "last_account"
      );
      expect(lastAccountBlocker).toBeDefined();
    });

    test("should allow deletion if user has multiple accounts", async () => {
      await resetDb();
      const user = await setTestSession();

      // Create second account
      const [account2] = await db
        .insert(account_table)
        .values({
          user_id: user.user.id,
          email: "second@test.com",
          password: await Bun.password.hash("password"),
        })
        .returning();

      const blockers = await checkAccountDeletionBlockers(
        account2.id,
        user.user.id
      );

      const lastAccountBlocker = blockers.find(
        (b) => b.type === "last_account"
      );
      expect(lastAccountBlocker).toBeUndefined();
    });

    test("should allow deletion if account is member (not owner) of org tenant", async () => {
      await resetDb();

      // Create owner
      const owner = await setTestSession(undefined, "owner@test.com");

      // Create member
      const member = await setTestSession(undefined, "member@test.com");

      // Create org tenant owned by owner (automatically adds owner)
      const orgTenant = await createTestTenant(
        owner.user.id,
        "Company",
        owner.account.id
      );

      // Add member to tenant
      await db.insert(account_metadata_table).values({
        user_id: member.user.id,
        account_id: member.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: member.role.id, // Member role
      });

      const blockers = await checkAccountDeletionBlockers(
        member.account.id,
        member.user.id
      );

      // Should only have "last_account" blocker, not sole_owner or personal_tenant
      const soleOwnerBlocker = blockers.find((b) => b.type === "sole_owner");
      const personalTenantBlocker = blockers.find(
        (b) => b.type === "personal_tenant"
      );

      expect(soleOwnerBlocker).toBeUndefined();
      expect(personalTenantBlocker).toBeUndefined();
    });
  });

  describe("canRemoveAccountFromTenant", () => {
    test("should allow member to leave org tenant", async () => {
      await resetDb();

      const owner = await setTestSession(undefined, "owner@test.com");
      const member = await setTestSession(undefined, "member@test.com");

      // Create org tenant (automatically adds owner)
      const orgTenant = await createTestTenant(
        owner.user.id,
        "Company",
        owner.account.id
      );

      // Create a member role (not owner)
      const [memberRole] = await db
        .insert(role_table)
        .values({
          name: "Member",
          kind: "member",
          allowed: [],
        })
        .returning();

      // Add member user with member role
      await db.insert(account_metadata_table).values({
        user_id: member.user.id,
        account_id: member.account.id,
        tenant_id: orgTenant.tenant.id,
        role_id: memberRole.id,
      });

      const result = await canRemoveAccountFromTenant(
        member.account.id,
        orgTenant.tenant.id,
        member.account.id // Self-removal
      );

      expect(result.allowed).toBe(true);
    });

    test("should not allow last owner to leave org tenant", async () => {
      await resetDb();
      const user = await setTestSession();

      // Create org tenant (automatically adds user as owner)
      const orgTenant = await createTestTenant(
        user.user.id,
        "Solo Org",
        user.account.id
      );

      const result = await canRemoveAccountFromTenant(
        user.account.id,
        orgTenant.tenant.id,
        user.account.id // Self-removal
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("only owner");
    });

    test("should not allow removing account from personal tenant", async () => {
      await resetDb();
      const user = await setTestSession();

      const result = await canRemoveAccountFromTenant(
        user.account.id,
        user.tenant.id, // Personal tenant
        user.account.id
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("personal tenant");
    });

    test("should return false if account not in tenant", async () => {
      await resetDb();

      const user1 = await setTestSession(undefined, "user1@test.com");
      const user2 = await setTestSession(undefined, "user2@test.com");

      // Create org tenant with only user1 (automatically adds user1)
      const orgTenant = await createTestTenant(
        user1.user.id,
        "Company",
        user1.account.id
      );

      // Try to remove user2 who is not in tenant
      const result = await canRemoveAccountFromTenant(
        user2.account.id,
        orgTenant.tenant.id,
        user1.account.id
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("checkUserDeletionBlockers", () => {
    test("should aggregate blockers from all accounts", async () => {
      await resetDb();
      const user = await setTestSession();

      // Create first org tenant (automatically adds account)
      const org1 = await createTestTenant(
        user.user.id,
        "Company 1",
        user.account.id
      );

      // Create second account
      const [account2] = await db
        .insert(account_table)
        .values({
          user_id: user.user.id,
          email: "second@test.com",
          password: await Bun.password.hash("password"),
        })
        .returning();

      // Create second org tenant (automatically adds account2)
      const org2 = await createTestTenant(
        user.user.id,
        "Company 2",
        account2.id
      );

      const blockers = await checkUserDeletionBlockers(user.user.id);

      // Should have blockers for being sole owner of both companies
      expect(blockers.length).toBeGreaterThan(0);
      const soleOwnerBlockers = blockers.filter((b) => b.type === "sole_owner");
      expect(soleOwnerBlockers.length).toBe(2);

      const company1Blocker = soleOwnerBlockers.find(
        (b) => b.tenantName === "Company 1"
      );
      const company2Blocker = soleOwnerBlockers.find(
        (b) => b.tenantName === "Company 2"
      );

      expect(company1Blocker).toBeDefined();
      expect(company2Blocker).toBeDefined();
    });

    test("should filter out last_account blockers", async () => {
      await resetDb();
      const user = await setTestSession();

      // User only has personal tenant
      const blockers = await checkUserDeletionBlockers(user.user.id);

      // Should not have "last_account" blocker since we're deleting entire user
      const lastAccountBlocker = blockers.find(
        (b) => b.type === "last_account"
      );
      expect(lastAccountBlocker).toBeUndefined();
    });

    test("should allow deletion if user is only in personal tenants", async () => {
      await resetDb();
      const user = await setTestSession();

      // User only has personal tenant (no org tenants)
      const blockers = await checkUserDeletionBlockers(user.user.id);

      // Should have no blockers
      expect(blockers.length).toBe(0);
    });
  });
});
