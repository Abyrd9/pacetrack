import type { Context } from "hono";

export function getClientIP(c: Context): string {
  // Parse x-forwarded-for properly (comma-separated list)
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (original client)
    const firstIP = forwardedFor.split(",")[0].trim();
    if (firstIP) return firstIP;
  }

  return (
    c.req.header("x-real-ip") ?? c.req.header("cf-connecting-ip") ?? "unknown"
  );
}
