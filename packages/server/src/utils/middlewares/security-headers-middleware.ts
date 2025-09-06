import type { App } from "../../index";

// Security Headers Middleware
// These headers protect against various web vulnerabilities
export async function securityHeadersMiddleware(app: App) {
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
    const cspValue = [
      "default-src 'self'", // Only allow resources from your own domain
      "script-src 'self' 'unsafe-inline'", // Scripts from your domain + inline scripts
      "style-src 'self' 'unsafe-inline'", // Styles from your domain + inline styles
      "img-src 'self' data: https:", // Images from your domain, data URLs, and HTTPS sources
      "font-src 'self' data:", // Fonts from your domain and data URLs
      "connect-src 'self'", // AJAX/fetch requests only to your domain
      "frame-ancestors 'none'", // Prevents your site from being embedded in frames
    ].join("; ");

    c.header("Content-Security-Policy", cspValue);

    return next();
  });
}
