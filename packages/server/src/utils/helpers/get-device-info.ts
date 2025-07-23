import type { Context } from "hono";

export type DeviceInfo = {
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
};

/**
 * Extracts device information from the request
 * @param c - Hono context
 * @returns Device information object
 */
export function getDeviceInfo(c: Context): DeviceInfo {
  // Get user agent
  const userAgent = c.req.header("user-agent");

  // Get IP address - try multiple headers
  const forwardedFor = c.req.header("x-forwarded-for");
  let ipAddress: string | undefined;

  if (forwardedFor) {
    // Take the first IP (original client)
    ipAddress = forwardedFor.split(",")[0].trim();
  } else {
    ipAddress = c.req.header("x-real-ip") ?? c.req.header("cf-connecting-ip");
  }

  // Optional: You can accept a custom device fingerprint from the client
  // This would be calculated on the frontend using libraries like FingerprintJS
  // Implement if users are complaining about session information not being accurate
  const deviceFingerprint = c.req.header("x-device-fingerprint");

  return {
    userAgent,
    ipAddress,
    deviceFingerprint,
  };
}
