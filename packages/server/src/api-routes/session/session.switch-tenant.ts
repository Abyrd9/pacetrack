import {
	SESSION_SWITCH_TENANT_ROUTE_PATH,
	SessionSwitchTenantRequestSchema,
	makeSessionSwitchTenantRouteResponse,
	tenant_table,
	users_to_tenants_table,
} from "@pacetrack/schema";
import { and, eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionSwitchTenantRoute(app: App) {
	app.post(SESSION_SWITCH_TENANT_ROUTE_PATH, async (c) => {
		try {
			const userId = c.get("user_id");

			if (!Bun.env.SESSION_SECRET) {
				throw new Error("SESSION_SECRET is not set");
			}

			const token = await getSignedCookie(
				c,
				Bun.env.SESSION_SECRET,
				"pacetrack-session",
			);

			if (!token) {
				return c.json(
					makeSessionSwitchTenantRouteResponse({
						key: SESSION_SWITCH_TENANT_ROUTE_PATH,
						status: "error",
						errors: { form: "Unauthorized" },
					}),
					401,
				);
			}

			const parsed = await getParsedBody(
				c.req,
				SessionSwitchTenantRequestSchema,
			);
			if (!parsed.success) {
				return c.json(
					makeSessionSwitchTenantRouteResponse({
						key: SESSION_SWITCH_TENANT_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { tenant_id } = parsed.data;

			// Verify the tenant exists
			const tenant = await db.query.tenant_table.findFirst({
				where: eq(tenant_table.id, tenant_id),
			});

			if (!tenant) {
				return c.json(
					makeSessionSwitchTenantRouteResponse({
						key: SESSION_SWITCH_TENANT_ROUTE_PATH,
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// Verify the user has access to this tenant
			const userTenant = await db
				.select()
				.from(users_to_tenants_table)
				.where(
					and(
						eq(users_to_tenants_table.user_id, userId),
						eq(users_to_tenants_table.tenant_id, tenant_id),
					),
				)
				.limit(1);

			if (userTenant.length === 0) {
				return c.json(
					makeSessionSwitchTenantRouteResponse({
						key: SESSION_SWITCH_TENANT_ROUTE_PATH,
						status: "error",
						errors: { global: "You don't have access to this organization" },
					}),
					403,
				);
			}

			// Update the session to switch to the new tenant
			const sessionId = await sessions.getSessionIdFromToken(token);
			if (!sessionId) {
				return c.json(
					makeSessionSwitchTenantRouteResponse({
						key: SESSION_SWITCH_TENANT_ROUTE_PATH,
						status: "error",
						errors: { form: "Invalid session" },
					}),
					401,
				);
			}

			const updatedSession = await sessions.updateSessionTenant({
				sessionId,
				tenantId: tenant_id,
			});

			// Refresh the session cookie with the updated session
			await setSessionTokenCookie(c, token, updatedSession.expires_at);

			return c.json(
				makeSessionSwitchTenantRouteResponse({
					key: SESSION_SWITCH_TENANT_ROUTE_PATH,
					status: "ok",
					payload: { message: "Tenant switched successfully" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeSessionSwitchTenantRouteResponse({
					key: SESSION_SWITCH_TENANT_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
