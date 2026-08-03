const portalRoles = {
  advocate: ['advocate', 'rna'],
  client: ['client'],
  intern: ['intern'],
  admin: ['admin'],
};

function normalizePortal(portal) {
  return String(portal || '').trim().toLowerCase();
}

function isRoleAllowedForPortal(role, portal) {
  const normalizedRole = normalizePortal(role);
  const normalizedPortal = normalizePortal(portal);
  return Boolean(portalRoles[normalizedPortal] && portalRoles[normalizedPortal].includes(normalizedRole));
}

/** Single unified login — role-specific /login aliases redirect in the SPA. */
function getPortalLoginRoute(_portal) {
  return '/login';
}

function roleHome(role) {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'advocate':
    case 'rna':
      return '/advocate';
    case 'intern':
      return '/intern';
    case 'client':
      return '/client';
    default:
      return '/access-denied';
  }
}

function getPostLoginRoute(user = {}) {
  if (user.accountStatus === 'suspended') {
    return '/account-restricted';
  }
  return roleHome(user.role);
}

module.exports = {
  portalRoles,
  normalizePortal,
  isRoleAllowedForPortal,
  getPortalLoginRoute,
  getPostLoginRoute,
  roleHome,
};
