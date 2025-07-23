export function getCookieDomain() {
  if (process.env.NODE_ENV !== "production") return "localhost";
  if (!process.env.DOMAIN) return undefined;

  // If ALLOW_SUBDOMAIN is true, add the subdomain dot to the domain
  let domain = process.env.DOMAIN;
  if (process.env.ALLOW_SUBDOMAIN === "true") domain = `.${domain}`;

  return domain;
}
