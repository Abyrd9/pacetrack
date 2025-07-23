import {
	ACCOUNT_SWITCH_ROUTE_PATH,
	AccountSwitchRequestSchema,
	account_table,
	hasPermission,
	makeAccountSwitchRouteResponse,
	role_table,
	tenant_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";

export function accountSwitchRoute(app: App) {
	app.post(ACCOUNT_SWITCH_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			const parsed = await getParsedBody(c.req, AccountSwitchRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeAccountSwitchRouteResponse({
						key: ACCOUNT_SWITCH_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { tenantId, targetAccountId } = parsed.data;

			// ensure tenant exists
			const tenant = await db.query.tenant_table.findFirst({
				where: eq(tenant_table.id, tenantId),
			});
			if (!tenant) {
				return c.json(
					makeAccountSwitchRouteResponse({
						key: ACCOUNT_SWITCH_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// caller must manage_billing on source tenant
			const roleResp = await db
				.select({ role: role_table })
				.from(users_to_tenants_table)
				.innerJoin(
					role_table,
					eq(role_table.id, users_to_tenants_table.role_id),
				)
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, tenantId),
					),
				);
			const role = roleResp[0]?.role;
			if (!role || !hasPermission(role, "manage_billing")) {
				return c.json(
					makeAccountSwitchRouteResponse({
						key: ACCOUNT_SWITCH_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			if (targetAccountId === null) {
				// Detach: create new account and subscription
				const newAccount = await db.transaction(async (tx) => {
					const acc = await tx
						.insert(account_table)
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

					const { customer, subscription } = await createNewCustomer(user);
					await tx
						.update(account_table)
						.set({ customer_id: customer.id, subscription_id: subscription.id })
						.where(eq(account_table.id, acc[0].id));
					await tx
						.update(tenant_table)
						.set({ account_id: acc[0].id })
						.where(eq(tenant_table.id, tenantId));
					return acc[0];
				});
				return c.json(
					makeAccountSwitchRouteResponse({
						key: ACCOUNT_SWITCH_ROUTE_PATH,
						status: "ok",
						payload: {
							message: `Tenant switched to new account ${newAccount.id}`,
						},
					}),
					200,
				);
			}

			// switching to existing account: confirm user has manage_billing in any tenant of that account
			const permissionRows = await db
				.select({ role: role_table })
				.from(tenant_table)
				.innerJoin(
					users_to_tenants_table,
					eq(users_to_tenants_table.tenant_id, tenant_table.id),
				)
				.innerJoin(
					role_table,
					eq(role_table.id, users_to_tenants_table.role_id),
				)
				.where(
					and(
						eq(tenant_table.account_id, targetAccountId),
						eq(users_to_tenants_table.user_id, userId),
						isNull(tenant_table.deleted_at),
					),
				);

			const hasManage = permissionRows.some((r) =>
				hasPermission(r.role, "manage_billing"),
			);
			if (!hasManage) {
				return c.json(
					makeAccountSwitchRouteResponse({
						key: ACCOUNT_SWITCH_ROUTE_PATH,
						status: "error",
						errors: {
							global: "You are not authorized to manage target account",
						},
					}),
					403,
				);
			}

			// perform switch
			await db
				.update(tenant_table)
				.set({ account_id: targetAccountId })
				.where(eq(tenant_table.id, tenantId));

			return c.json(
				makeAccountSwitchRouteResponse({
					key: ACCOUNT_SWITCH_ROUTE_PATH,
					status: "ok",
					payload: { message: "Tenant switched" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountSwitchRouteResponse({
					key: ACCOUNT_SWITCH_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
