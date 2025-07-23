import {
  USER_UPDATE_ROUTE_PATH,
  UserUpdateRequestSchema,
  makeUserUpdateRouteResponse,
  user_table,
  type User,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { deleteFile, uploadFile } from "src/utils/helpers/s3";

export function userUpdateRoute(app: App) {
  app.post(USER_UPDATE_ROUTE_PATH, async (c) => {
    const tenantId = c.get("tenant_id");
    const userId = c.get("user_id");
    try {
      const parsed = await getParsedBody(c.req, UserUpdateRequestSchema);
      if (!parsed.success) {
        return c.json(
          makeUserUpdateRouteResponse({
            key: USER_UPDATE_ROUTE_PATH,
            status: "error",
            errors: parsed.errors,
          }),
          400
        );
      }

      const { id, display_name, image_url } = parsed.data;

      if (id !== userId) {
        return c.json(
          makeUserUpdateRouteResponse({
            key: USER_UPDATE_ROUTE_PATH,
            status: "error",
            errors: { global: "You are not authorized to update this user" },
          }),
          403
        );
      }

      const currentUser = await db.query.user_table.findFirst({
        where: eq(user_table.id, userId),
      });

      if (!currentUser) {
        return c.json(
          makeUserUpdateRouteResponse({
            key: USER_UPDATE_ROUTE_PATH,
            status: "error",
            errors: { global: "User not found" },
          }),
          400
        );
      }

      // TODO: Upload image to S3
      let image_url_path: string | null = null;
      if (image_url) {
        // If user already has an avatar, remove it (best-effort)
        if (currentUser.image_url)
          deleteFile(currentUser.image_url).catch(() => {});

        const buffer = Buffer.from(await image_url.arrayBuffer());
        const png = await sharp(buffer).png().toBuffer();

        // Add short uid so file name changes and CDN invalidates
        const uid = nanoid();
        const avatarFileName = `${currentUser.id}_avatar_${uid}.png`;

        const newPngFile = new File([png], avatarFileName, {
          type: "image/png",
        });

        image_url_path = await uploadFile(newPngFile, {
          tenantId: tenantId,
          path: avatarFileName,
        });
      }

      const set: Partial<User> = {};
      if (display_name) set.display_name = display_name;
      if (image_url_path) set.image_url = image_url_path;

      const user = await db
        .update(user_table)
        .set(set)
        .where(eq(user_table.id, id))
        .returning();

      if (user.length === 0) {
        return c.json(
          makeUserUpdateRouteResponse({
            key: USER_UPDATE_ROUTE_PATH,
            status: "error",
            errors: { global: "User not found" },
          }),
          400
        );
      }

      return c.json(
        makeUserUpdateRouteResponse({
          key: USER_UPDATE_ROUTE_PATH,
          status: "ok",
          payload: user[0],
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeUserUpdateRouteResponse({
          key: USER_UPDATE_ROUTE_PATH,
          status: "error",
          errors: { global: "Internal server error" },
        }),
        500
      );
    }
  });
}
