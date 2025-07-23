import {
	account_group_table,
	account_metadata_table,
	account_table,
	account_to_account_group_table,
	DEFAULT_ROLES,
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
			})),
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

	// Step 5: Create personal tenants (one per account)
	console.log("🏢 Creating personal tenants...");
	const personalTenants = await db
		.insert(tenant_table)
		.values(
			accounts.map((account, idx) => ({
				name: "Personal",
				kind: "personal" as const,
				created_by: account.user_id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})),
		)
		.returning();
	console.log(`✅ Created ${personalTenants.length} personal tenants`);

	// Step 6: Create organization tenants (5 random companies)
	console.log("🏢 Creating organization tenants...");
	await seed(db, { tenant_table }).refine((f) => ({
		tenant_table: {
			count: 5,
			columns: {
				name: f.companyName(),
				kind: f.default({ defaultValue: "org" }),
				image_url: f.default({ defaultValue: null }),
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

	// Step 7: Create account metadata (links accounts to tenants with roles)
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
		`✅ Created ${
			personalMetadata.length + orgMetadata.length
		} account metadata entries`,
	);

	// Step 8: Create account groups for org tenants with hierarchies
	console.log("👥 Creating account groups with hierarchies...");

	// Create hierarchical groups for each org tenant
	for (const orgTenant of orgTenants) {
		// Root level departments
		const engineering = await db
			.insert(account_group_table)
			.values({
				name: "Engineering",
				description: "Engineering department",
				tenant_id: orgTenant.id,
				parent_group_id: null,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		const marketing = await db
			.insert(account_group_table)
			.values({
				name: "Marketing",
				description: "Marketing department",
				tenant_id: orgTenant.id,
				parent_group_id: null,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			})
			.returning();

		// Sub-teams under Engineering
		await db.insert(account_group_table).values([
			{
				name: "Frontend Team",
				description: "Frontend engineering team",
				tenant_id: orgTenant.id,
				parent_group_id: engineering[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			},
			{
				name: "Backend Team",
				description: "Backend engineering team",
				tenant_id: orgTenant.id,
				parent_group_id: engineering[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			},
		]);

		// Sub-teams under Marketing
		await db.insert(account_group_table).values([
			{
				name: "Content Team",
				description: "Content marketing team",
				tenant_id: orgTenant.id,
				parent_group_id: marketing[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			},
			{
				name: "Growth Team",
				description: "Growth marketing team",
				tenant_id: orgTenant.id,
				parent_group_id: marketing[0].id,
				created_at: sql`now()`,
				updated_at: sql`now()`,
			},
		]);
	}

	const accountGroups = await db.query.account_group_table.findMany();
	console.log(
		`✅ Created ${accountGroups.length} account groups with hierarchies`,
	);

	// Step 9: Link accounts to account groups
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
			tenantAccounts.length,
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
		`✅ Created ${accountToGroupLinks.length} account-to-group links`,
	);

	console.log("\n🎉 Database seeding completed successfully!");
	console.log("\n📊 Summary:");
	console.log(`   - ${roles.length} roles`);
	console.log(`   - ${users.length} users`);
	console.log(`   - ${accounts.length} accounts`);
	console.log(`   - ${personalTenants.length} personal tenants`);
	console.log(`   - ${orgTenants.length} organization tenants`);
	console.log(
		`   - ${
			personalMetadata.length + orgMetadata.length
		} account metadata entries`,
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
