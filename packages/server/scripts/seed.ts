import {
  account_group_table,
  account_metadata_table,
  account_table,
  account_to_account_group_table,
  DEFAULT_ROLES,
  membership_table,
  role_table,
  tenant_table,
  user_table,
} from "@pacetrack/schema";
import { type SQL, sql } from "drizzle-orm";
import { reset, seed } from "drizzle-seed";
import { db } from "../src/db";

async function main() {
  console.log("🌱 Starting database seeding...");

  // Optional: Reset the database first (uncomment if you want to clear existing data)
  console.log("🗑️  Resetting database...");
  await reset(db, {
    user_table,
    account_table,
    membership_table,
    tenant_table,
    role_table,
    account_metadata_table,
    account_group_table,
    account_to_account_group_table,
  });
  console.log("✅ Database reset complete");

  // Step 1: Insert default roles first (they're referenced by account_metadata)
  console.log("📋 Creating default roles...");
  const roles = await db
    .insert(role_table)
    .values(Object.values(DEFAULT_ROLES))
    .returning();
  console.log(`✅ Created ${roles.length} roles`);

  // Step 2: Create users
  console.log("👥 Creating users...");
  const users = await db
    .insert(user_table)
    .values(
      Array.from({ length: 10 }, () => ({
        created_at: sql`now()`,
        updated_at: sql`now()`,
      }))
    )
    .returning();
  console.log(`✅ Created ${users.length} users`);

  // Step 3: Hash a default password for all accounts
  console.log("🔐 Hashing password...");
  const hashedPassword = await Bun.password.hash("password123");

  // Step 4: Create accounts with the seed function for realistic data
  console.log("📧 Creating accounts...");
  await seed(db, { account_table }).refine((f) => ({
    account_table: {
      count: 10,
      columns: {
        email: f.email(),
        password: f.default({ defaultValue: hashedPassword }),
        display_name: f.fullName(),
        image_url: f.default({ defaultValue: null }),
        user_id: f.valuesFromArray({
          values: users.map((u) => u.id),
        }),
        // Reset password fields (not set during seeding)
        reset_password_token: f.default({ defaultValue: null }),
        reset_password_expires: f.default({ defaultValue: null }),
        // Change email fields (not set during seeding)
        pending_email: f.default({ defaultValue: null }),
        pending_email_token: f.default({ defaultValue: null }),
        pending_email_expires: f.default({ defaultValue: null }),
        // Soft delete fields (not set during seeding)
        deleted_at: f.default({ defaultValue: null }),
      },
    },
  }));

  // Get the created accounts
  const accounts = await db.query.account_table.findMany();
  console.log(`✅ Created ${accounts.length} accounts`);

  // Step 5: Create memberships
  console.log("💳 Creating memberships...");
  const memberships = await db
    .insert(membership_table)
    .values(
      accounts.map((account) => ({
        customer_id: `cus_${Math.random().toString(36).substring(7)}`,
        subscription_id: `sub_${Math.random().toString(36).substring(7)}`,
        created_by: account.user_id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      }))
    )
    .returning();
  console.log(`✅ Created ${memberships.length} memberships`);

  // Step 6: Create personal tenants (one per account)
  console.log("🏢 Creating personal tenants...");
  const personalTenants = await db
    .insert(tenant_table)
    .values(
      accounts.map((account, idx) => ({
        name: "Personal",
        kind: "personal" as const,
        membership_id: memberships[idx].id,
        created_by: account.user_id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      }))
    )
    .returning();
  console.log(`✅ Created ${personalTenants.length} personal tenants`);

  // Step 7: Create organization tenants
  console.log("🏢 Creating organization tenants...");
  await seed(db, { tenant_table }).refine((f) => ({
    tenant_table: {
      count: 5,
      columns: {
        name: f.companyName(),
        kind: f.default({ defaultValue: "org" }),
        image_url: f.default({ defaultValue: null }),
        membership_id: f.valuesFromArray({
          values: memberships.map((m) => m.id),
        }),
        created_by: f.valuesFromArray({
          values: users.map((u) => u.id),
        }),
        // Soft delete fields (not set during seeding)
        deleted_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
      },
    },
  }));

  const orgTenants = await db.query.tenant_table.findMany({
    where: (tenants, { eq }) => eq(tenants.kind, "org"),
  });
  console.log(`✅ Created ${orgTenants.length} organization tenants`);

  // Step 8: Create account metadata (links accounts to tenants with roles)
  console.log("🔗 Creating account metadata...");

  // Find owner role once
  const ownerRole = roles.find((r) => r.kind === "owner");
  if (!ownerRole) {
    throw new Error("Owner role not found");
  }

  // Each account gets linked to their personal tenant as owner
  const personalMetadata = accounts.map((account, idx) => ({
    user_id: account.user_id,
    account_id: account.id,
    tenant_id: personalTenants[idx].id,
    role_id: ownerRole.id,
    created_at: sql`now()`,
    updated_at: sql`now()`,
  }));

  // Link some accounts to org tenants with different roles
  const orgMetadata: Array<{
    user_id: string;
    account_id: string;
    tenant_id: string;
    role_id: string;
    created_at: SQL<unknown>;
    updated_at: SQL<unknown>;
  }> = [];

  for (const orgTenant of orgTenants) {
    // Pick 3-5 random accounts to add to this org
    const numMembers = Math.floor(Math.random() * 3) + 3;
    const shuffledAccounts = [...accounts].sort(() => Math.random() - 0.5);
    const selectedAccounts = shuffledAccounts.slice(0, numMembers);

    for (let i = 0; i < selectedAccounts.length; i++) {
      const account = selectedAccounts[i];
      // First member is owner, rest are random roles
      type RoleKind = "owner" | "member" | "tenant_admin" | "billing_admin";
      const roleKind: RoleKind =
        i === 0
          ? "owner"
          : (["member", "tenant_admin", "billing_admin"][
              Math.floor(Math.random() * 3)
            ] as RoleKind);

      const role = roles.find((r) => r.kind === roleKind);
      if (!role) {
        throw new Error(`Role ${roleKind} not found`);
      }

      orgMetadata.push({
        user_id: account.user_id,
        account_id: account.id,
        tenant_id: orgTenant.id,
        role_id: role.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      });
    }
  }

  await db
    .insert(account_metadata_table)
    .values([...personalMetadata, ...orgMetadata]);
  console.log(
    `✅ Created ${personalMetadata.length + orgMetadata.length} account metadata entries`
  );

  // Step 9: Create account groups for org tenants
  console.log("👥 Creating account groups...");
  await seed(db, { account_group_table }).refine((f) => ({
    account_group_table: {
      count: 10,
      columns: {
        name: f.valuesFromArray({
          values: [
            "Engineering",
            "Marketing",
            "Sales",
            "Product",
            "Design",
            "Customer Success",
            "Finance",
            "HR",
            "Operations",
            "Leadership",
          ],
        }),
        description: f.loremIpsum({ sentencesCount: 1 }),
        image_url: f.default({ defaultValue: null }),
        tenant_id: f.valuesFromArray({
          values: orgTenants.map((t) => t.id),
        }),
        // Soft delete fields (not set during seeding)
        deleted_at: f.default({ defaultValue: null }),
      },
    },
  }));

  const accountGroups = await db.query.account_group_table.findMany();
  console.log(`✅ Created ${accountGroups.length} account groups`);

  // Step 10: Link accounts to account groups
  console.log("🔗 Linking accounts to account groups...");
  const accountToGroupLinks: Array<{
    account_id: string;
    account_group_id: string;
    created_at: SQL<unknown>;
    updated_at: SQL<unknown>;
  }> = [];

  for (const group of accountGroups) {
    // Get accounts that belong to this tenant
    const tenantAccounts = await db.query.account_metadata_table.findMany({
      where: (metadata, { eq }) => eq(metadata.tenant_id, group.tenant_id),
    });

    // Add 2-4 random accounts from this tenant to the group
    const numMembers = Math.min(
      Math.floor(Math.random() * 3) + 2,
      tenantAccounts.length
    );
    const shuffled = [...tenantAccounts].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numMembers);

    for (const metadata of selected) {
      accountToGroupLinks.push({
        account_id: metadata.account_id,
        account_group_id: group.id,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      });
    }
  }

  if (accountToGroupLinks.length > 0) {
    await db.insert(account_to_account_group_table).values(accountToGroupLinks);
  }
  console.log(
    `✅ Created ${accountToGroupLinks.length} account-to-group links`
  );

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${accounts.length} accounts`);
  console.log(`   - ${memberships.length} memberships`);
  console.log(`   - ${personalTenants.length} personal tenants`);
  console.log(`   - ${orgTenants.length} organization tenants`);
  console.log(
    `   - ${personalMetadata.length + orgMetadata.length} account metadata entries`
  );
  console.log(`   - ${accountGroups.length} account groups`);
  console.log(`   - ${accountToGroupLinks.length} account-to-group links`);
  console.log("\n🔑 All accounts use password: password123");

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
