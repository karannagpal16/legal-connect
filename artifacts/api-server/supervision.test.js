const assert = require("assert");
const { createSupervision, ADVOCATE_GATED, ASSIGNMENT_ROUTES } = require("./supervision");

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function fakeDeps({ status = "active", verified = true, user = { id: UUID_A, role: "advocate" }, body = {} } = {}) {
  const db = {
    dbAvailable: true,
    async query(sql) {
      if (/ALTER TABLE/.test(sql)) return { rows: [] };
      if (/SELECT account_status FROM users/.test(sql)) return { rows: [{ account_status: status }] };
      if (/profile_advocates/.test(sql)) return { rows: verified ? [{ "?column?": 1 }] : [] };
      return { rows: [] };
    },
  };
  return createSupervision({
    db,
    sendJson: () => undefined,
    readBody: async () => body,
    getAuthUser: () => user,
    canSeeAll: (u) => ["admin", "rna"].includes(u?.role),
    writeAuditLog: async () => undefined,
    notify: async () => undefined,
    resolveRecipients: async () => [],
    portalUrl: (p) => p,
    isUuid: (v) => /^[0-9a-f-]{36}$/i.test(String(v)),
    resolveDatabaseUserId: async (u) => u.id,
    isMasterTestUser: async () => false,
  });
}

const req = (method) => ({ method });
const url = (path) => new URL(`http://x${path}`);

(async () => {
  // Gate lists cover the money/client actions and skip read-only views.
  assert.ok(ADVOCATE_GATED.some((p) => p.test("/api/proxy-hub/verify-payment")));
  assert.ok(ADVOCATE_GATED.some((p) => p.test("/api/tasks/abc/proxy-accept")));
  assert.ok(ADVOCATE_GATED.some((p) => p.test("/api/chamber/today/hearings/abc/assign")));
  assert.ok(!ADVOCATE_GATED.some((p) => p.test("/api/identity-vault")));
  assert.ok(ASSIGNMENT_ROUTES.some((p) => p.test("/api/admin/proxy-tasks/abc/assign-proxy")));

  // Suspended accounts are stopped on every route, reads included.
  let s = fakeDeps({ status: "suspended", user: { id: UUID_A, role: "client" } });
  let blocked = await s.guard(req("GET"), url("/api/bookings"));
  assert.strictEqual(blocked?.status, 403);
  assert.strictEqual(blocked?.body.code, "ACCOUNT_SUSPENDED");
  assert.strictEqual(await s.guard(req("GET"), url("/api/health")), null);

  // Unverified advocates can read but not take paid/client work.
  s = fakeDeps({ verified: false });
  assert.strictEqual(await s.guard(req("GET"), url("/api/workspaces/advocate")), null);
  blocked = await s.guard(req("POST"), url("/api/proxy-hub/create-order"));
  assert.strictEqual(blocked?.body.code, "ADVOCATE_NOT_VERIFIED");

  // Verified advocates pass.
  s = fakeDeps({ verified: true });
  assert.strictEqual(await s.guard(req("POST"), url("/api/proxy-hub/create-order")), null);

  // Admin cannot hand work to an unverified advocate.
  s = fakeDeps({ verified: false, user: { id: UUID_B, role: "admin" }, body: { proxyAdvocateId: UUID_A } });
  blocked = await s.guard(req("POST"), url("/api/admin/proxy-tasks/abc/assign-proxy"));
  assert.strictEqual(blocked?.body.code, "ASSIGNEE_NOT_VERIFIED");

  // Oversized bodies are refused.
  s = fakeDeps();
  blocked = await s.guard({ method: "POST", __lcBodyTooLarge: true }, url("/api/sos"));
  assert.strictEqual(blocked?.status, 413);

  console.log("supervision.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
