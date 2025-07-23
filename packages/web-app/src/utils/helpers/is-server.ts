/**
 * Checks if we're running in a server environment
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}
