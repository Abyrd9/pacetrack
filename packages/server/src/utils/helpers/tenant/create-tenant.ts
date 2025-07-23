import {
  account_metadata_table,
  DEFAULT_ROLES,
  hasPermission,
  type Membership,
  membership_table,
  type Role,
  role_table,
  type Tenant,
  tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { Transaction } from "src/db";
import { db } from "src/db";
import { logger } from "../logger";
import { createFolderForTenant, uploadFile } from "../s3";

export type CreateTenantOptions = {
  name: string;
  accountId: string;
  userId: string;
  membershipId?: string;
  image?: File;
  tx?: Transaction;
};

export type CreateTenantResult = {
  tenant: Tenant;
  membership: Membership;
  role: Role;
};

/**
 * Creates a new tenant (workspace) with owner role and account metadata.
 * Can optionally use an existing membership or create a new one.
 */
export async function createTenant({
  name,
  accountId,
  userId,
  membershipId,
  image,
  tx: passedInTx,
}: CreateTenantOptions): Promise<CreateTenantResult> {
  const create = async (tx: Transaction) => {
    let membershipToUse: Membership;

    if (membershipId) {
      // User wants to use an existing membership - validate they have permission
      const existingMembership = await tx.query.membership_table.findFirst({
        where: eq(membership_table.id, membershipId),
      });

      if (!existingMembership) {
        throw new Error("Membership not found");
      }

      // Check if user has billing permissions in any tenant that uses this membership
      const permissionRows = await tx
        .select({ role: role_table })
        .from(tenant_table)
        .innerJoin(
          account_metadata_table,
          eq(account_metadata_table.tenant_id, tenant_table.id)
        )
        .innerJoin(
          role_table,
          eq(role_table.id, account_metadata_table.role_id)
        )
        .where(
          and(
            eq(tenant_table.membership_id, existingMembership.id),
            eq(account_metadata_table.account_id, accountId),
            isNull(tenant_table.deleted_at)
          )
        );

      const hasManageBilling = permissionRows.some((r) =>
        hasPermission(r.role, "manage_billing")
      );

      if (!hasManageBilling) {
        throw new Error("You are not authorized to use this membership");
      }

      membershipToUse = existingMembership;
    } else {
      // Create a new membership
      const newMembershipResult = await tx
        .insert(membership_table)
        .values({
          created_by: userId,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .returning();

      if (newMembershipResult.length === 0) {
        throw new Error("Membership not created");
      }

      membershipToUse = newMembershipResult[0];
    }

    // Create the tenant
    const tenantResult = await tx
      .insert(tenant_table)
      .values({
        name,
        membership_id: membershipToUse.id,
        created_by: userId,
        kind: "org",
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    if (tenantResult.length === 0) {
      throw new Error("Tenant not created");
    }

    const tenant = tenantResult[0];

    // Create owner role
    const ownerRoleResult = await tx
      .insert(role_table)
      .values({
        ...DEFAULT_ROLES.OWNER,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning();

    if (ownerRoleResult.length === 0) {
      throw new Error("Owner role not created");
    }

    const role = ownerRoleResult[0];

    // Create account metadata linking the account to this tenant
    await tx.insert(account_metadata_table).values({
      user_id: userId,
      account_id: accountId,
      tenant_id: tenant.id,
      role_id: role.id,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    });

    return {
      tenant,
      membership: membershipToUse,
      role,
    };
  };

  // Perform the database operations (use provided tx or create new one)
  let result: CreateTenantResult;
  if (passedInTx) {
    result = await create(passedInTx);
  } else {
    result = await db.transaction(async (newTx) => create(newTx));
  }

  // Handle non-critical operations outside transaction
  try {
    await createFolderForTenant(result.tenant.id);
  } catch (error) {
    logger.warn("tenant-create", "Failed to create S3 folder for tenant", {
      tenantId: result.tenant.id,
      error,
    });
  }

  // Handle image upload if provided
  if (image) {
    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      const png = await sharp(buffer).png().toBuffer();

      // Add short uid so file name changes and CDN invalidates
      const uid = nanoid();
      const avatarFileName = `${result.tenant.id}_avatar_${uid}.png`;

      // Convert Buffer to Uint8Array for File constructor typing
      const newPngFile = new File([new Uint8Array(png)], avatarFileName, {
        type: "image/png",
      });

      const image_url_path = await uploadFile(newPngFile, {
        tenantId: result.tenant.id,
        path: avatarFileName,
      });

      if (image_url_path) {
        await db
          .update(tenant_table)
          .set({ image_url: image_url_path })
          .where(eq(tenant_table.id, result.tenant.id));

        // Update the tenant object with the image URL
        result.tenant.image_url = image_url_path;
      }
    } catch (error) {
      logger.warn(
        "tenant-create",
        "Failed to process and upload tenant image",
        {
          tenantId: result.tenant.id,
          error,
        }
      );
    }
  }

  return result;
}
