import {
	account_table,
	account_to_tenant_table,
	hasPermission,
	MEMBERSHIP_CREATE_ROUTE_PATH,
	MembershipCreateRequestSchema,
	makeMembershipCreateRouteResponse,
	membership_table,
	role_table,
	tenant_table,
	user_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";

export function membershipCreateRoute(app: App) {
	app.post(MEMBERSHIP_CREATE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");
			const accountId = c.get("account_id");

			const parsed = await getParsedBody(c.req, MembershipCreateRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeMembershipCreateRouteResponse({
						key: MEMBERSHIP_CREATE_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { tenantId } = parsed.data;

			// fetch tenant
			const tenant = await db.query.tenant_table.findFirst({
				where: eq(tenant_table.id, tenantId),
			});
			if (!tenant) {
				return c.json(
					makeMembershipCreateRouteResponse({
						key: MEMBERSHIP_CREATE_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// check permission manage_billing
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
					makeMembershipCreateRouteResponse({
						key: MEMBERSHIP_CREATE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			// create membership + stripe customer/subscription in tx
			const result = await db.transaction(async (tx) => {
				const membership = await tx
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
					.set({
						customer_id: customer.id,
						subscription_id: subscription.id,
					})
					.where(eq(membership_table.id, membership[0].id));

				// Update tenant to point to the new membership
				await tx
					.update(tenant_table)
					.set({ membership_id: membership[0].id })
					.where(eq(tenant_table.id, tenantId));

				return membership[0];
			});

			return c.json(
				makeMembershipCreateRouteResponse({
					key: MEMBERSHIP_CREATE_ROUTE_PATH,
					status: "ok",
					payload: result,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeMembershipCreateRouteResponse({
					key: MEMBERSHIP_CREATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
