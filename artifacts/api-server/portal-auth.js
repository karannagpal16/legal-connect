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

function getPortalLoginRoute(portal) {
  const normalizedPortal = normalizePortal(portal);
  if (normalizedPortal === 'advocate') return '/advocate/login';
  if (normalizedPortal === 'client') return '/client/login';
  if (normalizedPortal === 'intern') return '/intern/login';
  if (normalizedPortal === 'admin') return '/admin/login';
  return '/login';
}

function getPostLoginRoute(user = {}) {
  if (user.accountStatus === 'suspended') {
    return '/account-restricted';
  }

  if (!user.onboardingCompleted) {
    return `/${user.role === 'rna' ? 'advocate' : user.role}/onboarding`;
  }

  if (['advocate', 'rna', 'intern'].includes(user.role) && user.verificationStatus !== 'verified') {
    return `/${user.role === 'rna' ? 'advocate' : user.role}/verification-pending`;
  }

  switch (user.role) {
    case 'client':
      return '/client/dashboard';
    case 'advocate':
    case 'rna':
      return '/advocate/dashboard';
    case 'intern':
      return '/intern/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/access-denied';
  }
}

module.exports = {
  portalRoles,
  normalizePortal,
  isRoleAllowedForPortal,
  getPortalLoginRoute,
  getPostLoginRoute,
};
