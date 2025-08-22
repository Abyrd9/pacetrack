// Centralized CORS configuration
// Add allowed origins here for cross-origin requests.
// Leave the array empty to effectively allow same-origin only (requests with no Origin header).

// If the environment variable CORS_ORIGINS is provided, it takes precedence.
// It should be a comma-separated list, e.g.:
// CORS_ORIGINS="http://localhost:3000,https://app.example.com"
function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  // Lowercase and strip single trailing slash for comparison
  return trimmed.replace(/\/$/, "").toLowerCase();
}

const ENV_ALLOWED_ORIGINS = (Bun.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

// Code-based defaults (used only when CORS_ORIGINS is not set)
const STATIC_ALLOWED_CORS_ORIGINS: string[] = [
  // Example entries:
  // "http://localhost:3000",
  // "https://app.example.com",
].map(normalizeOrigin);

export const ALLOWED_CORS_ORIGINS: string[] =
  ENV_ALLOWED_ORIGINS.length > 0
    ? ENV_ALLOWED_ORIGINS
    : STATIC_ALLOWED_CORS_ORIGINS;

// Whether to allow credentials (cookies, Authorization headers) to be sent
export const CORS_ALLOW_CREDENTIALS = true;

// Additional headers that clients are allowed to send
export const CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "x-csrf-token",
  "x-request-origin",
  "x-request-origin-url",
  // Common proxy/client IP headers (safe to allow even if browsers don't send them)
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  // Conditional requests (if you leverage ETag client-side)
  "If-None-Match",
];

// Headers that can be exposed to the browser
export const CORS_EXPOSE_HEADERS = [
  "Content-Length",
  "Content-Type",
  "ETag",
  // Rate limiting headers
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
  "Retry-After",
];

// Methods allowed for CORS requests
export const CORS_ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];
