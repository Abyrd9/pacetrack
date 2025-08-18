import {
	account_table,
	account_to_tenant_table,
	makeSessionSwitchAccountRouteResponse,
	SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
	SessionSwitchAccountRequestSchema,
	user_table,
} from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import type { App } from "src";
import { db } from "src/db";
import { setSessionTokenCookie } from "src/utils/helpers/auth-cookie";
import { sessions } from "src/utils/helpers/auth-session";
import { getParsedBody } from "src/utils/helpers/get-parsed-body";

export function sessionSwitchAccountRoute(app: App) {
	app.post(SESSION_SWITCH_ACCOUNT_ROUTE_PATH, async (c) => {
		try {
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
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { form: "Unauthorized" },
					}),
					401,
				);
			}

			const parsed = await getParsedBody(
				c.req,
				SessionSwitchAccountRequestSchema,
			);

			if (!parsed.success) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: parsed.errors,
					}),
					400,
				);
			}

			const { account_id } = parsed.data;

			// Verify the ACCOUNT exists and is not soft-deleted
			const account = await db.query.account_table.findFirst({
				where: and(
					eq(account_table.id, account_id),
					isNull(account_table.deleted_at),
				),
			});

			if (!account) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { global: "ACCOUNT not found" },
					}),
					404,
				);
			}

			// Get the user for this account
			const user = await db.query.user_table.findFirst({
				where: eq(user_table.id, account.user_id),
			});

			if (!user) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { global: "User not found" },
					}),
					404,
				);
			}

			if (user.id !== c.get("user_id")) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { global: "You don't have access to this account" },
					}),
					403,
				);
			}

			// Get the tenant this account is linked to
			const accountToTenant = await db
				.select()
				.from(account_to_tenant_table)
				.where(
					and(
						eq(account_to_tenant_table.account_id, account_id),
						isNull(account_to_tenant_table.deleted_at),
					),
				);

			if (accountToTenant.length === 0) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { global: "You don't have access to this organization" },
					}),
					403,
				);
			}

			if (!accountToTenant[0].tenant_id) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { global: "You don't have access to this account" },
					}),
					403,
				);
			}

			// Update the session to switch to the new ACCOUNT
			const sessionId = await sessions.getSessionIdFromToken(token);
			if (!sessionId) {
				return c.json(
					makeSessionSwitchAccountRouteResponse({
						key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
						status: "error",
						errors: { form: "Invalid session" },
					}),
					401,
				);
			}

			const updatedSession = await sessions.updateSessionAccount({
				sessionId,
				accountId: account_id,
				tenantId: accountToTenant[0].tenant_id,
			});

			// Refresh the session cookie with the updated session
			await setSessionTokenCookie(c, token, updatedSession.expires_at);

			return c.json(
				makeSessionSwitchAccountRouteResponse({
					key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
					status: "ok",
					payload: { message: "ACCOUNT switched successfully" },
				}),
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				makeSessionSwitchAccountRouteResponse({
					key: SESSION_SWITCH_ACCOUNT_ROUTE_PATH,
					status: "error",
					errors: { global: "Something went wrong" },
				}),
				500,
			);
		}
	});
}
