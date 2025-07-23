import {
	DEFAULT_ROLES,
	USER_ACCEPT_INVITE_ROUTE_PATH,
	UserAcceptInviteRequestSchema,
	makeUserAcceptInviteRouteResponse,
	role_table,
	tenant_table,
	user_invites_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function userAcceptInviteRoute(app: App) {
	app.post(USER_ACCEPT_INVITE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const parsed = await getParsedBody(c.req, UserAcceptInviteRequestSchema);

			if (!parsed.success) {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			const { code, email, tenantId } = parsed.data;

			const user = await db.query.user_table.findFirst({
				where: eq(user_table.id, userId),
			});

			if (user?.email !== email) {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized to accept this invite" },
					}),
					403,
				);
			}

			const response = await db
				.select()
				.from(user_invites_table)
				.where(
					and(
						eq(user_invites_table.code, code),
						eq(user_invites_table.email, email),
						eq(user_invites_table.tenant_id, tenantId),
					),
				);

			if (response.length === 0) {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			const invite = response[0];

			// Check if invite has expired
			if (!invite.expires_at) {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid invite" },
					}),
					400,
				);
			}

			if (Date.now() > new Date(invite.expires_at).getTime()) {
				// Mark invite as expired
				await db
					.update(user_invites_table)
					.set({ state: "expired" })
					.where(eq(user_invites_table.id, invite.id));

				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invite has expired" },
					}),
					400,
				);
			}

			if (invite.state === "expired") {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invite has expired" },
					}),
					400,
				);
			}

			if (invite.state !== "invited") {
				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "error",
						errors: { global: "Invalid request" },
					}),
					400,
				);
			}

			await db.transaction(async (tx) => {
				// Firstly we can delete the invite now
				await tx
					.delete(user_invites_table)
					.where(eq(user_invites_table.id, invite.id));

				// Then we can create a new role and add this user to this tenant
				const tenant = await tx
					.select()
					.from(tenant_table)
					.where(eq(tenant_table.id, tenantId));

				if (tenant.length === 0) {
					throw new Error("Tenant not found");
				}

				// We need to create a new role for this user
				const role = await tx
					.insert(role_table)
					.values({
						...DEFAULT_ROLES.USER,
						created_at: sql`now()`,
						updated_at: sql`now()`,
					})
					.returning();

				if (role.length === 0) {
					throw new Error("Role not created");
				}

				await tx.insert(users_to_tenants_table).values({
					user_id: userId,
					tenant_id: tenant[0].id,
					role_id: role[0].id,
					is_primary_contact: false,
					is_billing_contact: false,
					created_at: sql`now()`,
					updated_at: sql`now()`,
				});

				return c.json(
					makeUserAcceptInviteRouteResponse({
						key: USER_ACCEPT_INVITE_ROUTE_PATH,
						status: "ok",
						payload: {
							tenant: tenant[0],
						},
					}),
					200,
				);
			});
		} catch (error) {
			return c.json(
				makeUserAcceptInviteRouteResponse({
					key: USER_ACCEPT_INVITE_ROUTE_PATH,
					status: "error",
					errors: { global: "Invalid request" },
				}),
				400,
			);
		}
	});
}
