import {
	account_metadata_table,
	hasPermission,
	role_table,
	TENANT_DELETE_ROUTE,
	tenant_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth/auth-cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";
import {
	checkTenantDeletionBlockers,
	deleteTenantEntirely,
} from "src/utils/helpers/tenant/delete-tenant";

export function tenantDeleteRoute(app: App) {
	app.post(TENANT_DELETE_ROUTE.path, async (c) => {
		try {
			const userId = c.get("user_id");
			const accountId = c.get("account_id");

			const parsed = await getParsedBody(c.req, TENANT_DELETE_ROUTE.request);
			if (!parsed.success) {
				return c.json(
					TENANT_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}
			const { tenant_id } = parsed.data;

			// Load target tenant
			const tenant = await db.query.tenant_table.findFirst({
				where: and(
					eq(tenant_table.id, tenant_id),
					isNull(tenant_table.deleted_at),
				),
			});

			if (!tenant) {
				return c.json(
					TENANT_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "Tenant not found" },
					}),
					404,
				);
			}

			// Check permission
			const roleResp = await db
				.select({ role: role_table })
				.from(account_metadata_table)
				.innerJoin(
					role_table,
					eq(role_table.id, account_metadata_table.role_id),
				)
				.where(
					and(
						eq(account_metadata_table.account_id, accountId),
						eq(account_metadata_table.tenant_id, tenant_id),
					),
				);

			const role = roleResp[0]?.role;
			if (!role || !hasPermission(role, "manage_settings")) {
				return c.json(
					TENANT_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: "You are not authorized" },
					}),
					403,
				);
			}

			// Check for blockers
			const blockers = await checkTenantDeletionBlockers(tenant_id);
			const personalTenantBlocker = blockers.find(
				(b) => b.type === "personal_tenant",
			);

			if (personalTenantBlocker) {
				return c.json(
					TENANT_DELETE_ROUTE.createRouteResponse({
						status: "error",
						errors: { global: personalTenantBlocker.message },
					}),
					400,
				);
			}

			if (blockers.length > 0 && !parsed.data.bypassNonCriticalBlockers) {
				return c.json(
					TENANT_DELETE_ROUTE.createRouteResponse({
						status: "ok",
						payload: { messages: blockers.map((b) => b.message) },
					}),
					400,
				);
			}

			// Delete the tenant (this handles all cascade deletions and session updates)
			await deleteTenantEntirely(tenant_id, userId);

			// If the current session is on the deleted tenant, switch to personal tenant
			const session = c.get("session");
			if (session.tenant_id === tenant_id) {
				const personalTenant = await db.query.tenant_table.findFirst({
					where: and(
						eq(tenant_table.kind, "personal"),
						eq(tenant_table.created_by, userId),
						isNull(tenant_table.deleted_at),
					),
				});

				if (!personalTenant) {
					return c.json(
						TENANT_DELETE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: "Personal tenant not found" },
						}),
						404,
					);
				}

				if (!process.env.SESSION_SECRET) {
					throw new Error("SESSION_SECRET is not set");
				}

				const token = await getSignedCookie(
					c,
					process.env.SESSION_SECRET,
					"pacetrack-session",
				);

				if (!token) {
					return c.json(
						TENANT_DELETE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: "Unauthorized" },
						}),
						401,
					);
				}

				const sessionId = await getSessionClient().getSessionIdFromToken(token);
				if (!sessionId) {
					return c.json(
						TENANT_DELETE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: "Unauthorized" },
						}),
						401,
					);
				}

				const updatedSession = await getSessionClient().updateSessionTenant({
					sessionId,
					tenantId: personalTenant.id,
				});

				if (!updatedSession) {
					return c.json(
						TENANT_DELETE_ROUTE.createRouteResponse({
							status: "error",
							errors: { global: "Something went wrong" },
						}),
						500,
					);
				}

				// Refresh the session cookie with the updated session
				await setSessionTokenCookie(c, token, updatedSession.expires_at);
			}

			return c.json(
				TENANT_DELETE_ROUTE.createRouteResponse({
					status: "ok",
					payload: { messages: ["Tenant deleted"] },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				TENANT_DELETE_ROUTE.createRouteResponse({
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
