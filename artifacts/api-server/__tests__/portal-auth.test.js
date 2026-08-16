const test = require('node:test');
const assert = require('node:assert/strict');
const { getPostLoginRoute, isRoleAllowedForPortal, getPortalLoginRoute, normalizePortal } = require('../portal-auth');

test('maps portal entries to the unified login route', () => {
  assert.equal(normalizePortal('Advocate'), 'advocate');
  assert.equal(getPortalLoginRoute('client'), '/login');
  assert.equal(getPortalLoginRoute('intern'), '/login');
  assert.equal(getPortalLoginRoute('admin'), '/login');
});

test('routes users to live portal homes after login', () => {
  assert.equal(getPostLoginRoute({ role: 'client', accountStatus: 'active', verificationStatus: 'verified', onboardingCompleted: true }), '/client');
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'active', verificationStatus: 'verified', onboardingCompleted: true }), '/advocate');
  assert.equal(getPostLoginRoute({ role: 'intern', accountStatus: 'active', verificationStatus: 'draft', onboardingCompleted: true }), '/intern');
  assert.equal(getPostLoginRoute({ role: 'admin', accountStatus: 'active', verificationStatus: 'verified', onboardingCompleted: true }), '/admin');
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'suspended', verificationStatus: 'verified', onboardingCompleted: true }), '/account-restricted');
});

test('portal-role mapping blocks mismatches', () => {
  assert.equal(isRoleAllowedForPortal('client', 'advocate'), false);
  assert.equal(isRoleAllowedForPortal('advocate', 'advocate'), true);
  // RNA is an admin/ops alias — never an advocate portal role.
  assert.equal(isRoleAllowedForPortal('rna', 'advocate'), false);
  assert.equal(isRoleAllowedForPortal('rna', 'admin'), true);
  assert.equal(isRoleAllowedForPortal('finance_admin', 'admin'), true);
  assert.equal(isRoleAllowedForPortal('intern', 'intern'), true);
});

test('pending advocates stay on verification pending', () => {
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'active', verificationStatus: 'pending' }), '/advocate/verification-pending');
  assert.equal(getPostLoginRoute({ role: 'advocate', accountStatus: 'active', verificationStatus: 'suspended' }), '/advocate/verification-pending');
  assert.equal(getPostLoginRoute({ role: 'rna', accountStatus: 'active', verificationStatus: 'verified' }), '/admin');
});
