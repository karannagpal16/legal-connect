/**
 * Wouter nested routers (`nest`) treat absolute hrefs like `/admin/control`
 * as base+path → `/admin/admin/control`. Prefix `~` to address from app root.
 * Prefer removing `nest` for portals; keep this helper for safe absolute navigations.
 */
export function appPath(to: string | null | undefined): string {
  if (!to) return "~/";
  const value = String(to).trim();
  if (!value) return "~/";
  if (
    value.startsWith("~")
    || value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("mailto:")
    || value.startsWith("tel:")
    || value.startsWith("#")
  ) {
    return value;
  }
  return value.startsWith("/") ? `~${value}` : `~/${value}`;
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
