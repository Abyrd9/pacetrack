import {
	account_table,
	account_to_tenant_table,
	hasPermission,
	MEMBERSHIP_SWITCH_ROUTE_PATH,
	MembershipSwitchRequestSchema,
	makeMembershipSwitchRouteResponse,
	membership_table,
	role_table,
	tenant_table,
	user_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";

export function membershipSwitchRoute(app: App) {
	app.post(MEMBERSHIP_SWITCH_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const accountId = c.get("account_id");

			const parsed = await getParsedBody(c.req, MembershipSwitchRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeMembershipSwitchRouteResponse({
						key: MEMBERSHIP_SWITCH_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { tenantId, targetMembershipId } = parsed.data;

			// ensure tenant exists
			const tenant = await db.query.tenant_table.findFirst({
				where: eq(tenant_table.id, tenantId),
			});
			if (!tenant) {
				return c.json(
					makeMembershipSwitchRouteResponse({
						key: MEMBERSHIP_SWITCH_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// caller must manage_billing on source tenant
			const roleResp = await db
				.select({ role: role_table })
				.from(account_to_tenant_table)
				.innerJoin(
					role_table,
					eq(role_table.id, account_to_tenant_table.role_id),
				)
				.where(
					and(
						eq(account_to_tenant_table.account_id, accountId),
						eq(account_to_tenant_table.tenant_id, tenantId),
					),
				);
			const role = roleResp[0]?.role;
			if (!role || !hasPermission(role, "manage_billing")) {
				return c.json(
					makeMembershipSwitchRouteResponse({
						key: MEMBERSHIP_SWITCH_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			if (targetMembershipId === null) {
				// Detach: create new membership and subscription
				const newMembership = await db.transaction(async (tx) => {
					const acc = await tx
						.insert(membership_table)
						.values({
							created_by: userId,
							created_at: sql`now()`,
							updated_at: sql`now()`,
						})
						.returning();

					const user = await db.query.user_table.findFirst({
						where: eq(user_table.id, userId),
					});
					if (!user) {
						throw new Error("User not found");
					}

					const account = await db.query.account_table.findFirst({
						where: eq(account_table.id, accountId),
					});
					if (!account) {
						throw new Error("Account not found");
					}

					const { customer, subscription } = await createNewCustomer(
						user,
						account,
					);
					await tx
						.update(membership_table)
						.set({ customer_id: customer.id, subscription_id: subscription.id })
						.where(eq(membership_table.id, acc[0].id));
					// Update tenant to point to new membership
					await tx
						.update(tenant_table)
						.set({ membership_id: acc[0].id })
						.where(eq(tenant_table.id, tenantId));
					return acc[0];
				});
				return c.json(
					makeMembershipSwitchRouteResponse({
						key: MEMBERSHIP_SWITCH_ROUTE_PATH,
						status: "ok",
						payload: {
							message: `Tenant switched to new membership ${newMembership.id}`,
						},
					}),
					200,
				);
			}

			// switching to existing membership: confirm user has manage_billing in any tenant of that membership
			const permissionRows = await db
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
						eq(tenant_table.membership_id, targetMembershipId),
						eq(account_to_tenant_table.account_id, accountId),
						isNull(tenant_table.deleted_at),
					),
				);

			const hasManage = permissionRows.some((r) =>
				hasPermission(r.role, "manage_billing"),
			);
			if (!hasManage) {
				return c.json(
					makeMembershipSwitchRouteResponse({
						key: MEMBERSHIP_SWITCH_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to manage target membership",
						},
					}),
					403,
				);
			}

			// perform switch: remove old membership relationship and create new one
			// Update tenant to point to the target membership
			await db
				.update(tenant_table)
				.set({ membership_id: targetMembershipId })
				.where(eq(tenant_table.id, tenantId));

			return c.json(
				makeMembershipSwitchRouteResponse({
					key: MEMBERSHIP_SWITCH_ROUTE_PATH,
					status: "ok",
					payload: { message: "Tenant switched" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeMembershipSwitchRouteResponse({
					key: MEMBERSHIP_SWITCH_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
