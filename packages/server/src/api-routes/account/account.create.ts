import {
	ACCOUNT_CREATE_ROUTE_PATH,
	AccountCreateRequestSchema,
	account_table,
	hasPermission,
	makeAccountCreateRouteResponse,
	role_table,
	tenant_table,
	user_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq, sql } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import { createNewCustomer } from "src/utils/helpers/stripe-helpers/new-customer";

export function accountCreateRoute(app: App) {
	app.post(ACCOUNT_CREATE_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			const parsed = await getParsedBody(c.req, AccountCreateRequestSchema);
			if (!parsed.success) {
				return c.json(
					makeAccountCreateRouteResponse({
						key: ACCOUNT_CREATE_ROUTE_PATH,
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
					makeAccountCreateRouteResponse({
						key: ACCOUNT_CREATE_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// check permission manage_billing
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
					makeAccountCreateRouteResponse({
						key: ACCOUNT_CREATE_ROUTE_PATH,
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			// create account + stripe customer/subscription in tx
			const result = await db.transaction(async (tx) => {
				const account = await tx
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
					.set({
						customer_id: customer.id,
						subscription_id: subscription.id,
					})
					.where(eq(account_table.id, account[0].id));

				await tx
					.update(tenant_table)
					.set({ account_id: account[0].id })
					.where(eq(tenant_table.id, tenantId));

				return account[0];
			});

			return c.json(
				makeAccountCreateRouteResponse({
					key: ACCOUNT_CREATE_ROUTE_PATH,
					status: "ok",
					payload: result,
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeAccountCreateRouteResponse({
					key: ACCOUNT_CREATE_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
