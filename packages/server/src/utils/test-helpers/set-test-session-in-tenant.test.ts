import { describe, expect, test } from "bun:test";
import { account_metadata_table } from "@pacetrack/schema";
import { db } from "src/db";
import { createTestTenant } from "./create-test-tenant";
import { resetDb } from "./reset-db";
import { setTestSession } from "./set-test-session";
import { setTestSessionInTenant } from "./set-test-session-in-tenant";

describe("setTestSessionInTenant", () => {
  test("should create session in specified tenant context", async () => {
    await resetDb();

    // Create a user with personal tenant
    const user = await setTestSession();

    // Create an org tenant
    const orgTenant = await createTestTenant(
      user.user.id,
      "Test Org",
      user.account.id
    );

    // Create a session in the org tenant context
    const orgSession = await setTestSessionInTenant(
      user.user.id,
      orgTenant.tenant.id
    );

    // Verify the session is in the org tenant context
    expect(orgSession.tenant.id).toBe(orgTenant.tenant.id);
    expect(orgSession.tenant.kind).toBe("org");
    expect(orgSession.session.tenant_id).toBe(orgTenant.tenant.id);
    expect(orgSession.user.id).toBe(user.user.id);
    expect(orgSession.account.id).toBe(user.account.id);
  });

  test("should work with specific account ID", async () => {
    await resetDb();

    // Create a user
    const user = await setTestSession();

    // Create org tenant
    const orgTenant = await createTestTenant(
      user.user.id,
      "Test Org",
      user.account.id
    );

    // Create session with explicit account ID
    const session = await setTestSessionInTenant(
      user.user.id,
      orgTenant.tenant.id,
      user.account.id
    );

    expect(session.account.id).toBe(user.account.id);
    expect(session.tenant.id).toBe(orgTenant.tenant.id);
  });

  test("should throw if user not found", async () => {
    await resetDb();

    await expect(async () => {
      await setTestSessionInTenant("nonexistent-user", "nonexistent-tenant");
    }).toThrow("User nonexistent-user not found");
  });

  test("should throw if tenant not found", async () => {
    await resetDb();
    const user = await setTestSession();

    await expect(async () => {
      await setTestSessionInTenant(user.user.id, "nonexistent-tenant");
    }).toThrow("Tenant nonexistent-tenant not found");
  });

  test("should throw if account not in tenant", async () => {
    await resetDb();

    // Create two users
    const user1 = await setTestSession(undefined, "user1@test.com");
    const user2 = await setTestSession(undefined, "user2@test.com");

    // Create org tenant with only user1
    const orgTenant = await createTestTenant(
      user1.user.id,
      "Test Org",
      user1.account.id
    );

    // Try to create session for user2 in user1's org tenant
    await expect(async () => {
      await setTestSessionInTenant(user2.user.id, orgTenant.tenant.id);
    }).toThrow(`No account found for user ${user2.user.id}`);
  });

  test("should work with multiple accounts in same tenant", async () => {
    await resetDb();

    // Create owner
    const owner = await setTestSession(undefined, "owner@test.com");

    // Create member
    const member = await setTestSession(undefined, "member@test.com");

    // Create org tenant
    const orgTenant = await createTestTenant(
      owner.user.id,
      "Test Org",
      owner.account.id
    );

    // Add member to org tenant
    await db.insert(account_metadata_table).values({
      user_id: member.user.id,
      account_id: member.account.id,
      tenant_id: orgTenant.tenant.id,
      role_id: orgTenant.role.id,
    });

    // Create sessions for both users in the org tenant
    const ownerSession = await setTestSessionInTenant(
      owner.user.id,
      orgTenant.tenant.id
    );

    const memberSession = await setTestSessionInTenant(
      member.user.id,
      orgTenant.tenant.id
    );

    // Both should be in the same tenant
    expect(ownerSession.tenant.id).toBe(orgTenant.tenant.id);
    expect(memberSession.tenant.id).toBe(orgTenant.tenant.id);

    // But different users/accounts
    expect(ownerSession.user.id).not.toBe(memberSession.user.id);
    expect(ownerSession.account.id).not.toBe(memberSession.account.id);
  });
});
