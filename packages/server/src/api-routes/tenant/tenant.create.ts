import {
	account_table,
	account_to_tenant_table,
	DEFAULT_ROLES,
	hasPermission,
	type Membership,
	makeTenantCreateRouteResponse,
	membership_table,
	role_table,
	TENANT_CREATE_ROUTE_PATH,
	TenantCreateRequestSchema,
	tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { App } from "src";
import { db } from "src/db";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { logger } from "src/utils/helpers/logger";
import { createFolderForTenant, uploadFile } from "src/utils/helpers/s3";

export function tenantCreateRoute(app: App) {
	app.post(TENANT_CREATE_ROUTE_PATH, async (c) => {
		try {
			const requestId = Math.random().toString(36).substring(7);
			logger.middleware(
				"TENANT_CREATE",
				"Starting tenant create request",
				requestId,
			);
			const userId = c.get("user_id");
			const accountId = c.get("account_id");

			const currentSession = c.get("session");
			logger.middleware("TENANT_CREATE", "Parsing request body", requestId);
			const parsed = await getParsedBody(c.req, TenantCreateRequestSchema);

			if (!parsed.success) {
				logger.middleware(
					"TENANT_CREATE",
					"Request body parsing failed",
					requestId,
					parsed.errors,
				);
				return c.json(
					makeTenantCreateRouteResponse({
						key: TENANT_CREATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { name, image, membership_id } = parsed.data;

			logger.middleware(
				"TENANT_CREATE",
				"Beginning database transaction",
				requestId,
				{ userId, membership_id, name },
			);
			return await db.transaction(async (tx) => {
				let membershipToUse: Membership;

				if (membership_id) {
					logger.middleware(
						"TENANT_CREATE",
						"Validating provided membership_id",
						requestId,
						{ membership_id },
					);
					// User wants to use an existing account - validate they have permission
					const existingMembership = await tx.query.membership_table.findFirst({
						where: eq(membership_table.id, membership_id),
					});

					if (!existingMembership) {
						logger.middleware("TENANT_CREATE", "Account not found", requestId, {
							membership_id,
						});
						return c.json(
							makeTenantCreateRouteResponse({
								key: TENANT_CREATE_ROUTE_PATH,
								status: "error",
								errors: { membership_id: "Membership not found" },
							}),
							404,
						);
					}

					// Check if user has manage_billing permission on any tenant under this account
					logger.middleware(
						"TENANT_CREATE",
						"Checking manage_billing permission for account",
						requestId,
						{ membership_id, membershipId: existingMembership.id },
					);
					// Check if user has billing permissions in any tenant that uses this membership
					const permissionRows = await tx
						.select({ role: role_table })
						.from(tenant_table)
						.innerJoin(
							account_to_tenant_table,
							eq(account_to_tenant_table.tenant_id, tenant_table.id),
						)
						.innerJoin(
							role_table,
							eq(role_table.id, account_to_tenant_table.role_id),
						)
						.where(
							and(
								eq(tenant_table.membership_id, existingMembership.id),
								eq(account_to_tenant_table.account_id, accountId),
								isNull(tenant_table.deleted_at),
							),
						);

					const hasManageBilling = permissionRows.some((r) =>
						hasPermission(r.role, "manage_billing"),
					);

					if (!hasManageBilling) {
						logger.middleware(
							"TENANT_CREATE",
							"User lacks manage_billing permission for account",
							requestId,
							{ membership_id, userId },
						);
						return c.json(
							makeTenantCreateRouteResponse({
								key: TENANT_CREATE_ROUTE_PATH,
								status: "error",
								errors: {
									membership_id:
										"You are not authorized to use this membership",
								},
							}),
							403,
						);
					}

					membershipToUse = existingMembership;
					logger.middleware(
						"TENANT_CREATE",
						"Using existing membership",
						requestId,
						{ account_id: membershipToUse.id },
					);
				} else {
					// Create a new membership
					logger.middleware(
						"TENANT_CREATE",
						"Creating new membership",
						requestId,
						{ userId },
					);
					const newMembership = await tx
						.insert(membership_table)
						.values({
							created_by: userId,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					membershipToUse = newMembership[0];
					logger.middleware("TENANT_CREATE", "New account created", requestId, {
						account_id: membershipToUse.id,
					});
				}

				logger.middleware("TENANT_CREATE", "Creating tenant", requestId, {
					account_id: membershipToUse.id,
					name,
				});
				const tenant = await tx
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

				logger.middleware("TENANT_CREATE", "Creating owner role", requestId, {
					tenant_id: tenant[0].id,
				});
				const ownerRole = await tx
					.insert(role_table)
					.values({
						...DEFAULT_ROLES.OWNER,
						created_at: sql`now()`,
						updated_at: sql`now()`,
					})
					.returning();

				logger.middleware(
					"TENANT_CREATE",
					"Linking user to tenant with role",
					requestId,
					{ tenant_id: tenant[0].id, role_id: ownerRole[0].id, userId },
				);
				await tx.insert(account_to_tenant_table).values({
					account_id: accountId,
					tenant_id: tenant[0].id,
					role_id: ownerRole[0].id,
					created_at: sql`now()`,
					updated_at: sql`now()`,
				});

				// Update the membership connection table
				logger.middleware(
					"TENANT_CREATE",
					"Linking user to tenant with membership",
					requestId,
					{
						tenant_id: tenant[0].id,
						membership_id: membershipToUse.id,
						userId,
						account_id: accountId,
					},
				);
				// Note: tenant-membership relationship is now handled via tenant.membership_id

				// Update the current session to switch to the new tenant
				logger.middleware(
					"TENANT_CREATE",
					"Updating current session to new tenant",
					requestId,
					{ session_id: currentSession.id, tenant_id: tenant[0].id },
				);
				await sessions.updateSessionTenant({
					sessionId: currentSession.id,
					tenantId: tenant[0].id,
				});

				logger.middleware(
					"TENANT_CREATE",
					"Creating tenant folder in storage",
					requestId,
					{ tenant_id: tenant[0].id },
				);
				await createFolderForTenant(tenant[0].id);

				let image_url_path: string | null = null;
				if (image) {
					logger.middleware(
						"TENANT_CREATE",
						"Processing tenant image",
						requestId,
						{ tenant_id: tenant[0].id },
					);
					const buffer = Buffer.from(await image.arrayBuffer());
					const png = await sharp(buffer).png().toBuffer();

					// Add short uid so file name changes and CDN invalidates
					const uid = nanoid();
					const avatarFileName = `${tenant[0].id}_avatar_${uid}.png`;

					// Convert Buffer to Uint8Array for File constructor typing
					const newPngFile = new File([new Uint8Array(png)], avatarFileName, {
						type: "image/png",
					});

					logger.middleware(
						"TENANT_CREATE",
						"Uploading tenant image",
						requestId,
						{ tenant_id: tenant[0].id, path: avatarFileName },
					);
					image_url_path = await uploadFile(newPngFile, {
						tenantId: tenant[0].id,
						path: avatarFileName,
					});
				}

				if (image_url_path) {
					logger.middleware(
						"TENANT_CREATE",
						"Saving tenant image URL",
						requestId,
						{ tenant_id: tenant[0].id, image_url_path },
					);
					await tx
						.update(tenant_table)
						.set({ image_url: image_url_path })
						.where(eq(tenant_table.id, tenant[0].id));
				}

				logger.middleware(
					"TENANT_CREATE",
					"Tenant created successfully",
					requestId,
					{ tenant_id: tenant[0].id },
				);
				return c.json(
					makeTenantCreateRouteResponse({
						key: TENANT_CREATE_ROUTE_PATH,
						status: "ok",
						payload: tenant[0],
					}),
					200,
				);
			});
		} catch (error) {
			logger.middlewareError(
				"TENANT_CREATE",
				"Error during tenant create",
				// requestId is only defined if we reached inside the handler before error
				// Fallback to a new id if needed
				Math.random()
					.toString(36)
					.substring(7),
				error,
			);
			return c.json(
				makeTenantCreateRouteResponse({
					key: TENANT_CREATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
