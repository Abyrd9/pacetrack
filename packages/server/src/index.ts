import type { Session } from "@pacetrack/schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { accountAcceptInviteRoute } from "./api-routes/account/account.accept-invite";
import { accountChangeEmailRoute } from "./api-routes/account/account.change-email";
import { accountConfirmEmailChangeRoute } from "./api-routes/account/account.confirm-email-change";
import { accountDeleteRoute } from "./api-routes/account/account.delete";
import { accountGetRoute } from "./api-routes/account/account.get";
import { accountGetByIdRoute } from "./api-routes/account/account.get-by-id";
import { accountGetRolesRoute } from "./api-routes/account/account.get-roles";
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
import { membershipCancelRoute } from "./api-routes/membership/membership.cancel";
import { membershipCreateRoute } from "./api-routes/membership/membership.create";
import { membershipGetRoute } from "./api-routes/membership/membership.get";
import { membershipPortalLinkRoute } from "./api-routes/membership/membership.portal-link";
import { membershipSwitchRoute } from "./api-routes/membership/membership.switch";
import { serveRoute } from "./api-routes/serve/serve";
import { sessionListRoute } from "./api-routes/session/session.list";
import { sessionRevokeRoute } from "./api-routes/session/session.revoke";
import { sessionRevokeAllRoute } from "./api-routes/session/session.revoke-all";
import { sessionSwitchAccountRoute } from "./api-routes/session/session.switch-account";
import { sessionSwitchTenantRoute } from "./api-routes/session/session.switch-tenant";
import { validateSessionRoute } from "./api-routes/session/session.validate";
import { tenantCreateRoute } from "./api-routes/tenant/tenant.create";
import { tenantDeleteRoute } from "./api-routes/tenant/tenant.delete";
import { tenantGetRoute } from "./api-routes/tenant/tenant.get";
import { tenantGetByIdRoute } from "./api-routes/tenant/tenant.get-by-id";
import { tenantUpdateRoute } from "./api-routes/tenant/tenant.update";
import { userCreateRoute } from "./api-routes/user/user.create";
import { userDeleteRoute } from "./api-routes/user/user.delete";
import { userGetByIdRoute } from "./api-routes/user/user.get-by-id";
import { authMiddleware } from "./utils/middlewares/auth";
import { csrfMiddleware } from "./utils/middlewares/csrf";
import { rateLimitingMiddleware } from "./utils/middlewares/rate-limiting";
import { securityHeadersMiddleware } from "./utils/middlewares/security-headers";

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

// Apply security headers first
securityHeadersMiddleware(app);

// Don't worry about CORS while running tests
// Actually this shouldn't matter so we need to figure this out
// TODO: Figure out how to handle CORS in tests
if (Bun.env.NODE_ENV !== "test") {
	app.use(
		cors(
			Bun.env.NODE_ENV !== "production"
				? {
						origin: "http://localhost:3000",
						credentials: true,
					}
				: undefined,
		),
	);
}
rateLimitingMiddleware(app);
authMiddleware(app);
csrfMiddleware(app);

// Authentication Routes (no auth required)
signInRoute(app);
signUpRoute(app);
forgotPasswordRoute(app);
resetPasswordRoute(app);
resetPasswordValidateRoute(app);
signOutRoute(app);

// Session Routes
validateSessionRoute(app);
sessionListRoute(app);
sessionRevokeRoute(app);
sessionRevokeAllRoute(app);
sessionSwitchAccountRoute(app);
sessionSwitchTenantRoute(app);

// Admin Tenant Routes
tenantGetRoute(app);
tenantGetByIdRoute(app);
tenantCreateRoute(app);
tenantUpdateRoute(app);
tenantDeleteRoute(app);

// Admin Account Routes
membershipGetRoute(app);
membershipCreateRoute(app);
membershipSwitchRoute(app);
membershipPortalLinkRoute(app);
membershipCancelRoute(app);

// Admin User Routes
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

// User Routes
userCreateRoute(app);
userGetByIdRoute(app);
userDeleteRoute(app);

// Admin User Group Routes
accountGroupGetRoute(app);
accountGroupGetByIdRoute(app);
accountGroupCreateRoute(app);
accountGroupUpdateRoute(app);
accountGroupDeleteRoute(app);
accountGroupAddAccountsRoute(app);
accountGroupRemoveAccountsRoute(app);

// Serve Route (no auth required)
serveRoute(app);

export type App = typeof app;
export default app;
