import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("/", "routes/frontend/dashboard/route.root.tsx", [
    index("routes/frontend/dashboard/route.tsx"),
    route("/settings", "routes/frontend/dashboard/settings/route.tsx"),
  ]),

  route("/api/set-theme", "routes/api/api.set-theme.ts"),
  route("/api/healthcheck", "routes/api/api.healthcheck.ts"),
  route("/api/sign-out", "routes/api/api.sign-out.ts"),
  route("/api/switch-tenant", "routes/api/api.switch-tenant.ts"),

  route("/auth", "routes/frontend/auth/route.root.tsx", [
    index("routes/frontend/auth/route.tsx"),
    route("/auth/sign-in", "routes/frontend/auth/sign-in/route.tsx"),
    route("/auth/sign-up", "routes/frontend/auth/sign-up/route.tsx"),
    route(
      "/auth/forgot-password",
      "routes/frontend/auth/forgot-password/route.tsx"
    ),
    route(
      "/auth/reset-password",
      "routes/frontend/auth/reset-password/route.tsx"
    ),
  ]),

  route("/callback", "routes/frontend/callback/route.root.tsx", [
    index("routes/frontend/callback/route.tsx"),
    route(
      "/callback/confirm-email-change",
      "routes/frontend/callback/confirm-email-change/route.tsx"
    ),
    route("/callback/oauth", "routes/frontend/callback/oauth/route.tsx"),
  ]),

  route("/robots.txt", "routes/resource.robots.ts"),
  route("/sitemap.xml", "routes/resource.sitemap.ts"),
] satisfies RouteConfig;
