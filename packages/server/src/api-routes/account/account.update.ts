import {
  ACCOUNT_UPDATE_ROUTE,
  type Account,
  account_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { deleteFile, uploadFile } from "src/utils/helpers/s3";
import {
  measureAsync,
  measureDatabaseQuery,
} from "src/utils/helpers/timing/timing-helpers";

export function accountUpdateRoute(app: App) {
  app.post(ACCOUNT_UPDATE_ROUTE.path, async (c) => {
    const tenantId = c.get("tenant_id");
    const accountId = c.get("account_id");
    try {
      const parsed = await getParsedBody(c.req, ACCOUNT_UPDATE_ROUTE.request);
      if (!parsed.success) {
        return c.json(
          ACCOUNT_UPDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { id, display_name, image } = parsed.data;

      if (id !== accountId) {
        return c.json(
          ACCOUNT_UPDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "You are not authorized to update this account" },
          }),
          403
        );
      }

      const currentAccount = await measureDatabaseQuery(
        c,
        "find-current-account",
        () =>
          db.query.account_table.findFirst({
            where: eq(account_table.id, accountId),
          })
      );

      if (!currentAccount) {
        return c.json(
          ACCOUNT_UPDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account not found" },
          }),
          400
        );
      }

      let image_url_path: string | null = null;
      if (image && image !== "REMOVE") {
        // If account already has an avatar, remove it (best-effort)
        if (currentAccount.image_url) {
          const imageUrl = currentAccount.image_url;
          await measureAsync(c, "s3-delete-old-avatar", () =>
            deleteFile(imageUrl)
          ).catch(() => {});
        }

        const buffer = Buffer.from(await image.arrayBuffer());
        const png = await measureAsync(c, "image-processing", () =>
          sharp(buffer).png().toBuffer()
        );

        // Add short uid so file name changes and CDN invalidates
        const uid = nanoid();
        const avatarFileName = `${currentAccount.id}_avatar_${uid}.png`;

        // @ts-expect-error - This works and is fine
        const newPngFile = new File([png], avatarFileName, {
          type: "image/png",
        });

        image_url_path = await measureAsync(c, "s3-upload-avatar", () =>
          uploadFile(newPngFile, {
            tenantId: tenantId,
            path: avatarFileName,
          })
        );
      } else if (image === "REMOVE") {
        // If account already has an avatar, remove it (best-effort)
        if (currentAccount.image_url) {
          const imageUrl = currentAccount.image_url;
          await measureAsync(c, "s3-delete-avatar", () =>
            deleteFile(imageUrl)
          ).catch(() => {});
        }
        image_url_path = null;
      }

      const set: Partial<Account> = {};
      if (display_name !== undefined) set.display_name = display_name;
      if (image_url_path) set.image_url = image_url_path;
      if (image === "REMOVE") set.image_url = null;

      const account = await measureDatabaseQuery(c, "update-account", () =>
        db
          .update(account_table)
          .set(set)
          .where(eq(account_table.id, id))
          .returning()
      );

      if (account.length === 0) {
        return c.json(
          ACCOUNT_UPDATE_ROUTE.createRouteResponse({
            status: "error",
            errors: { global: "Account not found" },
          }),
          400
        );
      }

      return c.json(
        ACCOUNT_UPDATE_ROUTE.createRouteResponse({
          status: "ok",
          payload: account[0],
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        ACCOUNT_UPDATE_ROUTE.createRouteResponse({
          status: "error",
          errors: { global: "Internal server error" },
        }),
        500
      );
    }
  });
}
