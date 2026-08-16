/**
 * Auth helpers — single session model + advocate gate.
 */

const { normalizeRole, isAdvocateBlocked, assertAuthenticated, assertNotBlockedAdvocate } = require("../../authorization");

function createAuthService() {
  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email || null,
      emailMasked: user.emailMasked || null,
      phoneMasked: user.phoneMasked || null,
      role: normalizeRole(user.role),
      verificationStatus: user.verificationStatus || user.verification_status || null,
      createdAt: user.createdAt || user.created_at || null,
    };
  }

  function requireVerifiedAdvocate(user) {
    assertAuthenticated(user);
    if (normalizeRole(user.role) === "advocate") assertNotBlockedAdvocate(user);
    return user;
  }

  return {
    publicUser,
    requireVerifiedAdvocate,
    isAdvocateBlocked,
    normalizeRole,
  };
}

module.exports = { createAuthService };
