const test = require('node:test');
const assert = require('node:assert/strict');
const { getPostLoginRoute, isRoleAllowedForPortal, getPortalLoginRoute, normalizePortal } = require('../portal-auth');

test('maps portal entries to the correct login routes', () => {
  assert.equal(normalizePortal('Advocate'), 'advocate');
  assert.equal(getPortalLoginRoute('client'), '/client/login');
  assert.equal(getPortalLoginRoute('intern'), '/intern/login');
});

test('routes users to the expected dashboard after login', () => {
  assert.equal(getPostLoginRoute({ role: 'client', accountStatus: 'active', verificationStatus: 'verified', onboardingCompleted: true }), '/client/dashboard');
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'active', verificationStatus: 'verified', onboardingCompleted: true }), '/advocate/dashboard');
  assert.equal(getPostLoginRoute({ role: 'intern', accountStatus: 'active', verificationStatus: 'draft', onboardingCompleted: true }), '/intern/verification-pending');
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'suspended', verificationStatus: 'verified', onboardingCompleted: true }), '/account-restricted');
});

test('portal-role mapping blocks mismatches', () => {
  assert.equal(isRoleAllowedForPortal('client', 'advocate'), false);
  assert.equal(isRoleAllowedForPortal('advocate', 'advocate'), true);
  assert.equal(isRoleAllowedForPortal('rna', 'advocate'), true);
  assert.equal(isRoleAllowedForPortal('intern', 'intern'), true);
});
