const portalRoles = {
  // RNA is an ops alias for admin — never an advocate portal role.
  advocate: ["advocate"],
  client: ["client"],
  intern: ["intern"],
  admin: ["admin", "rna", "super_admin", "verification_admin", "operations_admin", "content_reviewer", "finance_admin", "support_admin"],
};

function normalizePortal(portal) {
  return String(portal || "").trim().toLowerCase();
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "rna") return "admin";
  return value;
}

function isRoleAllowedForPortal(role, portal) {
  const normalizedRole = normalizeRole(role);
  const normalizedPortal = normalizePortal(portal);
  return Boolean(portalRoles[normalizedPortal] && portalRoles[normalizedPortal].includes(normalizedRole));
}

/** Single unified login — role-specific /login aliases redirect in the SPA. */
function getPortalLoginRoute(_portal) {
  return "/login";
}

function roleHome(role) {
  switch (normalizeRole(role)) {
    case "admin":
    case "super_admin":
    case "verification_admin":
    case "operations_admin":
    case "content_reviewer":
    case "finance_admin":
    case "support_admin":
      return "/admin";
    case "advocate":
      return "/advocate";
    case "intern":
      return "/intern";
    case "client":
      return "/client";
    default:
      return "/access-denied";
  }
}

function getPostLoginRoute(user = {}) {
  if (user.accountStatus === "suspended") {
    return "/account-restricted";
  }
  const verification = String(user.verificationStatus || user.verification_status || "").toLowerCase();
  if (normalizeRole(user.role) === "advocate" && ["pending", "under_review", "information_required", "rejected", "suspended"].includes(verification)) {
    return "/advocate/verification-pending";
  }
  return roleHome(user.role);
}

module.exports = {
  portalRoles,
  normalizePortal,
  normalizeRole,
  isRoleAllowedForPortal,
  getPortalLoginRoute,
  getPostLoginRoute,
  roleHome,
};
