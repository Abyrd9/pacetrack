import {
  CONFIRM_EMAIL_CHANGE_ROUTE_PATH,
  FORGOT_PASSWORD_ROUTE_PATH,
  RESET_PASSWORD_ROUTE_PATH,
  RESET_PASSWORD_VALIDATE_ROUTE_PATH,
  SIGN_IN_ROUTE_PATH,
  SIGN_UP_ROUTE_PATH,
  type Session,
} from "@pacetrack/schema";
import { Hono } from "hono";
import { getSignedCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { accountCancelRoute } from "./api-routes/account/account.cancel";
import { accountCreateRoute } from "./api-routes/account/account.create";
import { accountGetRoute } from "./api-routes/account/account.get";
import { accountPortalLinkRoute } from "./api-routes/account/account.portal-link";
import { accountSwitchRoute } from "./api-routes/account/account.switch";
import { forgotPasswordRoute } from "./api-routes/auth/forgot-password";
import { resetPasswordRoute } from "./api-routes/auth/reset-password";
import { resetPasswordValidateRoute } from "./api-routes/auth/reset-password-validate";
import { signInRoute } from "./api-routes/auth/sign-in";
import { signOutRoute } from "./api-routes/auth/sign-out";
import { signUpRoute } from "./api-routes/auth/sign-up";
import { serveRoute } from "./api-routes/serve/serve";
import { sessionListRoute } from "./api-routes/session/session.list";
import { sessionRevokeRoute } from "./api-routes/session/session.revoke";
import { sessionRevokeAllRoute } from "./api-routes/session/session.revoke-all";
import { sessionSwitchTenantRoute } from "./api-routes/session/session.switch-tenant";
import { validateSessionRoute } from "./api-routes/session/session.validate";
import { tenantCreateRoute } from "./api-routes/tenant/tenant.create";
import { tenantDeleteRoute } from "./api-routes/tenant/tenant.delete";
import { tenantGetRoute } from "./api-routes/tenant/tenant.get";
import { tenantGetByIdRoute } from "./api-routes/tenant/tenant.get-by-id";
import { tenantUpdateRoute } from "./api-routes/tenant/tenant.update";
import { userGroupAddUsersRoute } from "./api-routes/user-group/user-group.add-users";
import { userGroupCreateRoute } from "./api-routes/user-group/user-group.create";
import { userGroupDeleteRoute } from "./api-routes/user-group/user-group.delete";
import { userGroupGetRoute } from "./api-routes/user-group/user-group.get";
import { userGroupGetByIdRoute } from "./api-routes/user-group/user-group.get-by-id";
import { userGroupRemoveUsersRoute } from "./api-routes/user-group/user-group.remove-users";
import { userGroupUpdateRoute } from "./api-routes/user-group/user-group.update";
import { userAcceptInviteRoute } from "./api-routes/user/user.accept-invite";
import { userChangeEmailRoute } from "./api-routes/user/user.change-email";
import { userConfirmEmailChangeRoute } from "./api-routes/user/user.confirm-email-change";
import { userDeleteRoute } from "./api-routes/user/user.delete";
import { userGetRoute } from "./api-routes/user/user.get";
import { userGetByIdRoute } from "./api-routes/user/user.get-by-id";
import { userGetRolesRoute } from "./api-routes/user/user.get-roles";
import { userQueryRoute } from "./api-routes/user/user.query";
import { userUpdateRoute } from "./api-routes/user/user.update";
import { updatePasswordRoute } from "./api-routes/user/user.update-password";
import {
  deleteSessionTokenCookie,
  setSessionTokenCookie,
} from "./utils/helpers/auth-cookie";
import { sessions } from "./utils/helpers/auth-session";
import { validateCSRFToken } from "./utils/helpers/csrf";
import {
  apiRateLimit,
  authRateLimit,
  serveRateLimit,
} from "./utils/helpers/rate-limiter";

declare module "hono" {
  interface ContextVariableMap {
    user_id: string;
    tenant_id: string;
    role_id: string;
    session: Session;
  }
}

const app = new Hono();

// I don't want to worry about this while running tests
if (Bun.env.NODE_ENV !== "test") {
  app.use(
    cors(
      Bun.env.NODE_ENV !== "production"
        ? {
            origin: "http://localhost:3000",
            credentials: true,
          }
        : undefined
    )
  );
}

// Security Headers Middleware
// These headers protect against various web vulnerabilities
app.use("*", async (c, next) => {
  // X-Content-Type-Options: nosniff
  // Prevents browsers from "sniffing" (guessing) MIME types
  // Protects against MIME confusion attacks where malicious files are executed
  c.header("X-Content-Type-Options", "nosniff");

  // X-Frame-Options: DENY
  // Prevents your site from being embedded in iframes on other domains
  // Protects against clickjacking attacks
  c.header("X-Frame-Options", "DENY");

  // X-XSS-Protection: 1; mode=block
  // Enables browser's built-in XSS protection (mostly for older browsers)
  // Modern browsers use CSP instead, but this provides additional protection
  c.header("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: strict-origin-when-cross-origin
  // Controls what information is sent in the Referer header
  // Prevents leaking sensitive URL parameters to external sites
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Strict-Transport-Security (HSTS)
  // Forces browsers to only use HTTPS for your site
  // Protects against man-in-the-middle attacks
  // Only enabled in production to avoid breaking local development
  if (Bun.env.NODE_ENV === "production") {
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains" // 1 year, includes subdomains
    );
  }

  // Content Security Policy (CSP)
  // Defines what resources (scripts, styles, images, etc.) are allowed to load
  // Primary defense against XSS attacks
  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'", // Only allow resources from your own domain
      "script-src 'self' 'unsafe-inline'", // Scripts from your domain + inline scripts
      "style-src 'self' 'unsafe-inline'", // Styles from your domain + inline styles
      "img-src 'self' data: https:", // Images from your domain, data URLs, and HTTPS sources
      "font-src 'self' data:", // Fonts from your domain and data URLs
      "connect-src 'self'", // AJAX/fetch requests only to your domain
      "frame-ancestors 'none'", // Prevents your site from being embedded in frames
    ].join("; ")
  );

  await next();
});

// Rate limiting middleware (only enabled in production)
if (Bun.env.NODE_ENV === "production") {
  app.use("*", async (c, next) => {
    // Auth routes - strict rate limiting by IP
    if (
      c.req.path === SIGN_IN_ROUTE_PATH ||
      c.req.path === SIGN_UP_ROUTE_PATH ||
      c.req.path === FORGOT_PASSWORD_ROUTE_PATH ||
      c.req.path === RESET_PASSWORD_ROUTE_PATH ||
      c.req.path === RESET_PASSWORD_VALIDATE_ROUTE_PATH ||
      c.req.path === CONFIRM_EMAIL_CHANGE_ROUTE_PATH
    ) {
      return authRateLimit(c, next);
    }

    // Serve routes - generous rate limiting by IP
    if (c.req.path.startsWith("/serve/")) {
      return serveRateLimit(c, next);
    }

    // Skip rate limiting for root
    if (c.req.path === "/") {
      return next();
    }

    // All other API routes - standard rate limiting by user ID
    return apiRateLimit(c, next);
  });
}

// Authentication Middleware
app.use("*", async (c, next) => {
  // Skip auth for public routes
  if (
    c.req.path === SIGN_IN_ROUTE_PATH ||
    c.req.path === SIGN_UP_ROUTE_PATH ||
    c.req.path === FORGOT_PASSWORD_ROUTE_PATH ||
    c.req.path === RESET_PASSWORD_ROUTE_PATH ||
    c.req.path === RESET_PASSWORD_VALIDATE_ROUTE_PATH ||
    c.req.path === CONFIRM_EMAIL_CHANGE_ROUTE_PATH ||
    c.req.path.startsWith("/serve/") ||
    c.req.path === "/"
  ) {
    return next();
  }

  if (!Bun.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

  const token = await getSignedCookie(
    c,
    Bun.env.SESSION_SECRET,
    "pacetrack-session"
  );
  if (!token)
    return c.json(
      {
        key: c.req.path,
        status: "error",
        errors: { global: "Unauthorized" },
      },
      401
    );

  const ipAddress =
    c.req.header("x-forwarded-for") ??
    c.req.header("x-real-ip") ??
    c.req.header("cf-connecting-ip") ??
    "";

  const userAgent = c.req.header("user-agent") ?? "";

  const { session, tenant, user, role } = await sessions.validateToken({
    token,
    ipAddress,
    userAgent,
  });

  if (session === null) {
    await deleteSessionTokenCookie(c);
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Set the values in context
  c.set("user_id", user.id);
  c.set("tenant_id", tenant.id);
  c.set("role_id", role.id);
  c.set("session", session);

  await setSessionTokenCookie(c, token, new Date(session.expires_at));
  await next();
});

// CSRF Protection Middleware
// Prevents Cross-Site Request Forgery attacks where malicious sites make requests on behalf of authenticated users
app.use("*", async (c, next) => {
  // Skip CSRF validation for safe operations
  // GET requests are read-only and don't change state
  // Public routes (auth endpoints) don't need CSRF protection
  if (
    c.req.method === "GET" || // Read-only operations are safe
    c.req.path === SIGN_IN_ROUTE_PATH ||
    c.req.path === SIGN_UP_ROUTE_PATH ||
    c.req.path === FORGOT_PASSWORD_ROUTE_PATH ||
    c.req.path === RESET_PASSWORD_ROUTE_PATH ||
    c.req.path === RESET_PASSWORD_VALIDATE_ROUTE_PATH ||
    c.req.path === CONFIRM_EMAIL_CHANGE_ROUTE_PATH ||
    c.req.path.startsWith("/serve/") || // File serving is read-only
    c.req.path === "/" // Root endpoint
  ) {
    return next();
  }

  // For state-changing operations (POST/PUT/DELETE), validate CSRF token
  // CSRF token can be sent via header or query parameter
  const csrfToken = c.req.header("x-csrf-token") || c.req.query("csrf_token");

  // Get the session token from the signed cookie
  const sessionToken = await getSignedCookie(
    c,
    Bun.env.SESSION_SECRET || "",
    "pacetrack-session"
  );

  // Both CSRF token and session token are required
  if (!csrfToken || !sessionToken) {
    return c.json({ error: "CSRF token required" }, 403);
  }

  // Validate that the CSRF token matches what we expect for this session
  // The CSRF token is derived from the session token, so only legitimate requests can have valid tokens
  const isValid = await validateCSRFToken(csrfToken, sessionToken);
  if (!isValid) {
    return c.json({ error: "Invalid CSRF token" }, 403);
  }

  await next();
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
sessionSwitchTenantRoute(app);

// Admin Tenant Routes
tenantGetRoute(app);
tenantGetByIdRoute(app);
tenantCreateRoute(app);
tenantUpdateRoute(app);
tenantDeleteRoute(app);

// Admin Account Routes
accountGetRoute(app);
accountCreateRoute(app);
accountSwitchRoute(app);
accountPortalLinkRoute(app);
accountCancelRoute(app);

// Admin User Routes
userGetRoute(app);
userGetByIdRoute(app);
userGetRolesRoute(app);
userDeleteRoute(app);
userQueryRoute(app);
updatePasswordRoute(app);
userUpdateRoute(app);
userAcceptInviteRoute(app);
userChangeEmailRoute(app);
userConfirmEmailChangeRoute(app);

// Admin User Group Routes
userGroupGetRoute(app);
userGroupGetByIdRoute(app);
userGroupCreateRoute(app);
userGroupUpdateRoute(app);
userGroupDeleteRoute(app);
userGroupAddUsersRoute(app);
userGroupRemoveUsersRoute(app);

// Serve Route (no auth required)
serveRoute(app);

export type App = typeof app;
export default app;
