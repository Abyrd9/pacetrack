import {
  account_metadata_table,
  DEFAULT_ROLES,
  type Role,
  role_table,
  type Tenant,
  tenant_table,
} from "@pacetrack/schema";
import { eq, sql } from "drizzle-orm";
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
  image?: File;
  tx?: Transaction;
};

export type CreateTenantResult = {
  tenant: Tenant;
  role: Role;
};

/**
 * Creates a new tenant (workspace) with owner role and account metadata.
 */
export async function createTenant({
  name,
  accountId,
  userId,
  image,
  tx: passedInTx,
}: CreateTenantOptions): Promise<CreateTenantResult> {
  const create = async (tx: Transaction) => {
    // Create the tenant
    const tenantResult = await tx
      .insert(tenant_table)
      .values({
        name,
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
