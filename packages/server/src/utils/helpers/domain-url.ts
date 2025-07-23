import type { HonoRequest } from "hono";

export function getDomainUrl(request: HonoRequest) {
  const host =
    request.header("X-Forwarded-Host") ??
    request.header("host") ??
    new URL(request.url).host;
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export function getOriginUrl(request: HonoRequest) {
  const origin = request.header("origin");
  if (origin) return origin;

  return Bun.env.FRONTEND_URL ?? "http://localhost:3000";
}
