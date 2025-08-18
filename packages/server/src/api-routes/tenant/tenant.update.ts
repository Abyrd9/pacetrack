import {
	account_to_tenant_table,
	hasPermission,
	makeTenantUpdateRouteResponse,
	role_table,
	TENANT_UPDATE_ROUTE_PATH,
	type Tenant,
	TenantUpdateRequestSchema,
	tenant_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { deleteFile, uploadFile } from "src/utils/helpers/s3";

export function tenantUpdateRoute(app: App) {
	app.post(TENANT_UPDATE_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");
			const parsed = await getParsedBody(c.req, TenantUpdateRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { id, name, image } = parsed.data;

			const roles = await db
				.select({
					userTenant: account_to_tenant_table,
					role: role_table,
				})
				.from(account_to_tenant_table)
				.leftJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(
					and(
						eq(account_to_tenant_table.account_id, accountId),
						eq(account_to_tenant_table.tenant_id, id),
					),
				);

			const role = roles[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to update this tenant" },
					}),
					403,
				);
			}

			const currentTenant = await db.query.tenant_table.findFirst({
				where: eq(tenant_table.id, id),
			});

			if (!currentTenant) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					400,
				);
			}

			let image_url_path: string | null = null;
			if (image && image !== "REMOVE") {
				// If user already has an avatar, remove it (best-effort)
				if (currentTenant.image_url)
					deleteFile(currentTenant.image_url).catch(() => {});

				const buffer = Buffer.from(await image.arrayBuffer());
				const png = await sharp(buffer).png().toBuffer();

				// Add short uid so file name changes and CDN invalidates
				const uid = nanoid();
				const avatarFileName = `${currentTenant.id}_avatar_${uid}.png`;

				const newPngFile = new File([new Uint8Array(png)], avatarFileName, {
					type: "image/png",
				});

				image_url_path = await uploadFile(newPngFile, {
					tenantId: currentTenant.id,
					path: avatarFileName,
				});
			} else if (image === "REMOVE") {
				// If user already has an avatar, remove it (best-effort)
				if (currentTenant.image_url)
					deleteFile(currentTenant.image_url).catch(() => {});
				image_url_path = null;
			}

			const set: Partial<Tenant> = {};
			if (name) set.name = name;
			if (image_url_path) set.image_url = image_url_path;
			if (image === "REMOVE") set.image_url = null;

			const tenant = await db
				.update(tenant_table)
				.set(set)
				.where(eq(tenant_table.id, id))
				.returning();

			if (tenant.length === 0) {
				return c.json(
					makeTenantUpdateRouteResponse({
						key: TENANT_UPDATE_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					400,
				);
			}

			return c.json(
				makeTenantUpdateRouteResponse({
					key: TENANT_UPDATE_ROUTE_PATH,
					status: "ok",
					payload: tenant[0],
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeTenantUpdateRouteResponse({
					key: TENANT_UPDATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
