import {
	account_to_tenant_table,
	hasPermission,
	makeTenantInviteUsersRouteResponse,
	role_table,
	TENANT_INVITE_USERS_ROUTE_PATH,
	TenantInviteUsersRequestSchema,
	user_invites_table,
} from "@pacetrack/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function tenantInviteUsersRoute(app: App) {
	app.post(TENANT_INVITE_USERS_ROUTE_PATH, async (c) => {
		try {
			const accountId = c.get("account_id");

			const parsed = await getParsedBody(c.req, TenantInviteUsersRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeTenantInviteUsersRouteResponse({
						key: TENANT_INVITE_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			const usersToTenantsResponse = await db
				.select({
					userTenant: account_to_tenant_table,
					role: role_table,
				})
				.from(account_to_tenant_table)
				.leftJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(eq(account_to_tenant_table.account_id, accountId));

			const role = usersToTenantsResponse[0]?.role;

			if (!role || !hasPermission(role, "manage_users")) {
				return c.json(
					makeTenantInviteUsersRouteResponse({
						key: TENANT_INVITE_USERS_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to invite users" },
					}),
					403,
				);
			}

			// Create user invite columns for each email
			await db.transaction(async (tx) => {
				for (const email of parsed.data.emails) {
					// Check if there's an existing invite for this email and tenant
					const existingInvite = await tx
						.select()
						.from(user_invites_table)
						.where(
							and(
								eq(user_invites_table.email, email),
								eq(user_invites_table.tenant_id, parsed.data.tenantId),
							),
						)
						.limit(1);

					const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
					const expiresAt = new Date(Date.now() + TWENTY_FOUR_HOURS);

					if (existingInvite.length > 0) {
						// Update existing invite
						await tx
							.update(user_invites_table)
							.set({
								state: "invited",
								code: createId(), // Generate new code
								expires_at: expiresAt,
								updated_at: sql`now()`,
							})
							.where(eq(user_invites_table.id, existingInvite[0].id));
					} else {
						// Create new invite
						await tx.insert(user_invites_table).values({
							email,
							tenant_id: parsed.data.tenantId,
							state: "invited",
							code: createId(),
							expires_at: expiresAt,
						});
					}
				}

				// TODO: Send emails to the invited users
			});

			return c.json(
				makeTenantInviteUsersRouteResponse({
					key: TENANT_INVITE_USERS_ROUTE_PATH,
					status: "ok",
					payload: {
						message: "Users invited successfully",
					},
				}),
				200,
			);
		} catch (error) {
			return c.json(
				makeTenantInviteUsersRouteResponse({
					key: TENANT_INVITE_USERS_ROUTE_PATH,
					status: "error",
					errors: {
						global: "Invalid request",
					},
				}),
				400,
			);
		}
	});
}
