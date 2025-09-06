export function getCookieDomain() {
  if (Bun.env.NODE_ENV !== "production") return "localhost";
  if (!Bun.env.DOMAIN) return undefined;

  // If ALLOW_SUBDOMAIN is true, add the subdomain dot to the domain
  let domain = Bun.env.DOMAIN;
  if (Bun.env.ALLOW_SUBDOMAIN === "true") domain = `.${domain}`;

  return domain;
}
