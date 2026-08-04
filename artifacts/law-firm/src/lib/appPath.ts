/**
 * Wouter nested routers (`nest`) treat absolute hrefs like `/admin/control`
 * as base+path → `/admin/admin/control`. Prefix `~` to address from app root.
 * Prefer removing `nest` for portals; keep this helper for safe absolute navigations.
 */

/** Strip absolute same-app URLs / ~ prefixes down to a pathname + search + hash. */
export function toRelativePath(to: string | null | undefined): string {
  if (!to) return "/";
  const value = String(to).trim();
  if (!value) return "/";
  if (value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("#")) {
    return value;
  }
  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    // fall through
  }
  if (value.startsWith("~")) {
    const stripped = value.slice(1);
    return stripped.startsWith("/") ? stripped : `/${stripped || ""}`;
  }
  return value.startsWith("/") ? value : `/${value}`;
}

export function appPath(to: string | null | undefined): string {
  if (!to) return "~/";
  const value = String(to).trim();
  if (!value) return "~/";
  if (value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("#")) {
    return value;
  }
  // Absolute http(s) URLs cannot be SPA-navigated via wouter — normalize first.
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("~")) {
    const relative = toRelativePath(value);
    if (relative.startsWith("mailto:") || relative.startsWith("tel:") || relative.startsWith("#")) {
      return relative;
    }
    return relative.startsWith("/") ? `~${relative}` : `~/${relative}`;
  }
  return value.startsWith("/") ? `~${value}` : `~/${value}`;
}

/** Convenience for setLocation / Link hrefs that may receive absolute portal URLs. */
export function spaLocation(to: string | null | undefined): string {
  return appPath(toRelativePath(to));
}

/** Role home paths used after login / auth redirects. */
export function roleHomePath(role: string | null | undefined): string {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "advocate":
    case "rna":
      return "/advocate";
    case "intern":
      return "/intern";
    case "client":
    default:
      return "/client";
  }
}
