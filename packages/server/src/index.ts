import type { Session } from "@pacetrack/schema";
import { Hono } from "hono";
import { accountAcceptInviteRoute } from "./api-routes/account/account.accept-invite";
import { accountChangeEmailRoute } from "./api-routes/account/account.change-email";
import { accountConfirmEmailChangeRoute } from "./api-routes/account/account.confirm-email-change";
import { accountCreateRoute } from "./api-routes/account/account.create";
import { accountDeleteRoute } from "./api-routes/account/account.delete";
import { accountGetRoute } from "./api-routes/account/account.get";
import { accountGetByIdRoute } from "./api-routes/account/account.get-by-id";
import { accountGetRolesRoute } from "./api-routes/account/account.get-roles";
import { accountLinkRoute } from "./api-routes/account/account.link";
import { accountQueryRoute } from "./api-routes/account/account.query";
import { accountUpdateRoute } from "./api-routes/account/account.update";
import { updatePasswordRoute } from "./api-routes/account/account.update-password";
import { accountGroupAddAccountsRoute } from "./api-routes/account-group/account-group.add-account";
import { accountGroupCreateRoute } from "./api-routes/account-group/account-group.create";
import { accountGroupDeleteRoute } from "./api-routes/account-group/account-group.delete";
import { accountGroupGetRoute } from "./api-routes/account-group/account-group.get";
import { accountGroupGetByIdRoute } from "./api-routes/account-group/account-group.get-by-id";
import { accountGroupRemoveAccountsRoute } from "./api-routes/account-group/account-group.remove-account";
import { accountGroupUpdateRoute } from "./api-routes/account-group/account-group.update";
import { forgotPasswordRoute } from "./api-routes/auth/forgot-password";
import { resetPasswordRoute } from "./api-routes/auth/reset-password";
import { resetPasswordValidateRoute } from "./api-routes/auth/reset-password-validate";
import { signInRoute } from "./api-routes/auth/sign-in";
import { signOutRoute } from "./api-routes/auth/sign-out";
import { signUpRoute } from "./api-routes/auth/sign-up";
import { itemTemplateCreateRoute } from "./api-routes/item-template/item-template.create";
import { itemTemplateDeleteRoute } from "./api-routes/item-template/item-template.delete";
import { itemTemplateGetByIdRoute } from "./api-routes/item-template/item-template.get-by-id";
import { itemTemplateUpdateRoute } from "./api-routes/item-template/item-template.update";
import { pipelineInstanceCreateRoute } from "./api-routes/pipeline-instance/pipeline-instance.create";
import { pipelineInstanceDeleteRoute } from "./api-routes/pipeline-instance/pipeline-instance.delete";
import { pipelineInstanceGetRoute } from "./api-routes/pipeline-instance/pipeline-instance.get";
import { pipelineInstanceGetByIdRoute } from "./api-routes/pipeline-instance/pipeline-instance.get-by-id";
import { pipelineInstanceGetByTemplateIdRoute } from "./api-routes/pipeline-instance/pipeline-instance.get-by-template-id";
import { pipelineInstanceUpdateRoute } from "./api-routes/pipeline-instance/pipeline-instance.update";
import { pipelineTemplateCreateRoute } from "./api-routes/pipeline-template/pipeline-template.create";
import { pipelineTemplateDeleteRoute } from "./api-routes/pipeline-template/pipeline-template.delete";
import { pipelineTemplateGetRoute } from "./api-routes/pipeline-template/pipeline-template.get";
import { pipelineTemplateGetByIdRoute } from "./api-routes/pipeline-template/pipeline-template.get-by-id";
import { pipelineTemplateUpdateRoute } from "./api-routes/pipeline-template/pipeline-template.update";
import { serveRoute } from "./api-routes/serve/serve";
import { sessionCreateAccountRoute } from "./api-routes/session/session.create-account";
import { sessionCreateTenantRoute } from "./api-routes/session/session.create-tenant";
import { sessionGetAccountsMetaRoute } from "./api-routes/session/session.get-accounts-meta";
import { sessionLinkAccountRoute } from "./api-routes/session/session.link-account";
import { sessionListRoute } from "./api-routes/session/session.list";
import { sessionRemoveAccountRoute } from "./api-routes/session/session.remove-account";
import { sessionRevokeRoute } from "./api-routes/session/session.revoke";
import { sessionRevokeAllRoute } from "./api-routes/session/session.revoke-all";
import { sessionSwitchAccountRoute } from "./api-routes/session/session.switch-account";
import { sessionSwitchTenantRoute } from "./api-routes/session/session.switch-tenant";
import { validateSessionRoute } from "./api-routes/session/session.validate";
import { stepTemplateCreateRoute } from "./api-routes/step-template/step-template.create";
import { stepTemplateDeleteRoute } from "./api-routes/step-template/step-template.delete";
import { stepTemplateGetRoute } from "./api-routes/step-template/step-template.get";
import { stepTemplateGetByIdRoute } from "./api-routes/step-template/step-template.get-by-id";
import { stepTemplateUpdateRoute } from "./api-routes/step-template/step-template.update";
import { tenantCreateRoute } from "./api-routes/tenant/tenant.create";
import { tenantDeleteRoute } from "./api-routes/tenant/tenant.delete";
import { tenantGetRoute } from "./api-routes/tenant/tenant.get";
import { tenantGetByIdRoute } from "./api-routes/tenant/tenant.get-by-id";
import { tenantInviteUsersRoute } from "./api-routes/tenant/tenant.invite-users";
import { tenantUpdateRoute } from "./api-routes/tenant/tenant.update";
import { userCreateRoute } from "./api-routes/user/user.create";
import { userDeleteRoute } from "./api-routes/user/user.delete";
import { userGetByIdRoute } from "./api-routes/user/user.get-by-id";
import { checkRedisHealth, closeRedisConnection } from "./utils/helpers/redis";
import { authMiddleware } from "./utils/middlewares/auth-middleware";
import { corsMiddleware } from "./utils/middlewares/cors-middleware";
import { csrfMiddleware } from "./utils/middlewares/csrf-middleware";
import { rateLimitingMiddleware } from "./utils/middlewares/rate-limiting-middleware";
import { securityHeadersMiddleware } from "./utils/middlewares/security-headers-middleware";
import { serverTimingMiddleware } from "./utils/middlewares/server-timing-middleware";

declare module "hono" {
	interface ContextVariableMap {
		user_id: string;
		account_id: string;
		tenant_id: string;
		role_id: string;
		session: Session;
	}
}

const app = new Hono();

// server-timing middleware must be first to capture full request lifecycle
// Also sert-timing creates a unique request_id
serverTimingMiddleware(app);
securityHeadersMiddleware(app);
corsMiddleware(app);
rateLimitingMiddleware(app);
authMiddleware(app);
csrfMiddleware(app);

// Healthcheck Route (no auth required)
app.get("/api/healthcheck", (c) => {
	return c.json({
		status: "ok",
	});
});

// Redis Healthcheck Route (no auth required)
app.get("/api/healthcheck/redis", async (c) => {
	try {
		const isHealthy = await checkRedisHealth();

		return c.json({
			status: isHealthy ? "ok" : "error",
			redis: {
				connected: isHealthy,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Redis health check error:", error);
		return c.json(
			{
				status: "error",
				redis: {
					connected: false,
					error: error instanceof Error ? error.message : "Unknown error",
					timestamp: new Date().toISOString(),
				},
			},
			500,
		);
	}
});

// Authentication Routes (no auth required)
signInRoute(app);
signUpRoute(app);
forgotPasswordRoute(app);
resetPasswordRoute(app);
resetPasswordValidateRoute(app);
signOutRoute(app);

// Session Routes
validateSessionRoute(app);
sessionGetAccountsMetaRoute(app);
sessionListRoute(app);
sessionRevokeRoute(app);
sessionRevokeAllRoute(app);
sessionSwitchAccountRoute(app);
sessionSwitchTenantRoute(app);
sessionRemoveAccountRoute(app);
sessionLinkAccountRoute(app);
sessionCreateAccountRoute(app);
sessionCreateTenantRoute(app);

// Admin Tenant Routes
tenantGetRoute(app);
tenantGetByIdRoute(app);
tenantCreateRoute(app);
tenantInviteUsersRoute(app);
tenantUpdateRoute(app);
tenantDeleteRoute(app);

// Admin User Routes
accountCreateRoute(app);
accountGetRoute(app);
accountGetByIdRoute(app);
accountGetRolesRoute(app);
accountDeleteRoute(app);
accountQueryRoute(app);
updatePasswordRoute(app);
accountUpdateRoute(app);
accountAcceptInviteRoute(app);
accountChangeEmailRoute(app);
accountConfirmEmailChangeRoute(app);
accountLinkRoute(app);

// User Routes
userCreateRoute(app);
userDeleteRoute(app);
userGetByIdRoute(app);

// Admin User Group Routes
accountGroupGetRoute(app);
accountGroupGetByIdRoute(app);
accountGroupCreateRoute(app);
accountGroupUpdateRoute(app);
accountGroupDeleteRoute(app);
accountGroupAddAccountsRoute(app);
accountGroupRemoveAccountsRoute(app);

// Pipeline Template Routes
pipelineTemplateCreateRoute(app);
pipelineTemplateUpdateRoute(app);
pipelineTemplateDeleteRoute(app);
pipelineTemplateGetRoute(app);
pipelineTemplateGetByIdRoute(app);

// Pipeline Instance Routes
pipelineInstanceCreateRoute(app);
pipelineInstanceUpdateRoute(app);
pipelineInstanceDeleteRoute(app);
pipelineInstanceGetRoute(app);
pipelineInstanceGetByIdRoute(app);
pipelineInstanceGetByTemplateIdRoute(app);

// Step Template Routes
stepTemplateCreateRoute(app);
stepTemplateUpdateRoute(app);
stepTemplateDeleteRoute(app);
stepTemplateGetRoute(app);
stepTemplateGetByIdRoute(app);

// Item Template Routes
itemTemplateCreateRoute(app);
itemTemplateUpdateRoute(app);
itemTemplateDeleteRoute(app);
itemTemplateGetByIdRoute(app);

// Serve Route (no auth required)
serveRoute(app);

// Start the server only when this file is executed directly (not when imported) and the port is set
// Docs about import.meta.main: https://bun.sh/docs/api/import-meta
if (import.meta.main && process.env.INTERNAL_PORT) {
	const port = Number(process.env.INTERNAL_PORT);

	// Graceful shutdown handler
	const server = Bun.serve({
		fetch: app.fetch,
		port,
		hostname: "::", // Bind to IPv6 for Railway private networking
	});

	console.log(`Server listening on [::]:${port}`);

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("Received SIGINT, shutting down gracefully...");

		try {
			await closeRedisConnection();
			console.log("Redis connection closed");
		} catch (error) {
			console.error("Error closing Redis connection:", error);
		}

		server.stop();
		console.log("Server stopped");
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("Received SIGTERM, shutting down gracefully...");

		try {
			await closeRedisConnection();
			console.log("Redis connection closed");
		} catch (error) {
			console.error("Error closing Redis connection:", error);
		}

		server.stop();
		console.log("Server stopped");
		process.exit(0);
	});
}

export type App = typeof app;
export default app;
