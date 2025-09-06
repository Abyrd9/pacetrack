import type { Session } from "@pacetrack/schema";
import { Hono } from "hono";
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

securityHeadersMiddleware(app); // Apply security headers first
serverTimingMiddleware(app); // (must be early to capture full request lifecycle)
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

// Start the server only when this file is executed directly (not when imported) and the port is set
// Docs about import.meta.main: https://bun.sh/docs/api/import-meta
if (import.meta.main && Bun.env.INTERNAL_PORT) {
  const port = Number(Bun.env.INTERNAL_PORT);
  Bun.serve({
    fetch: app.fetch,
    port,
    hostname: "::", // Bind to IPv6 for Railway private networking
  });
  console.log(`Server listening on [::]:${port}`);
}

export type App = typeof app;
export default app;
