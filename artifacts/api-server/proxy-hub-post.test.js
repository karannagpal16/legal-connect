const assert = require("assert");
const {
  canPostProxyMission,
  isComplimentaryProxyOrder,
  safeErrorDetail,
  clientSafeErrorDetail,
  resolveMasterFreeUser,
  isUndefinedColumnError,
  buildProxyMissionRecord,
  insertProxyMission,
} = require("./proxy-hub-post");
const { isWorkHoldActive } = require("./work-hold");

assert.strictEqual(canPostProxyMission({ role: "advocate" }), true);
assert.strictEqual(canPostProxyMission({ role: "Advocate" }), true);
assert.strictEqual(canPostProxyMission({ role: "admin" }), true);
assert.strictEqual(canPostProxyMission({ role: "client" }), false);
assert.strictEqual(canPostProxyMission(null), false);

assert.deepStrictEqual(
  isComplimentaryProxyOrder({ razorpayOrderId: "order_proxy_demo_1", masterFree: false }),
  { demo: true, master: false },
);
assert.deepStrictEqual(
  isComplimentaryProxyOrder({
    razorpayOrderId: "order_proxy_master_1",
    mode: "master_test_free",
    masterFree: true,
  }),
  { demo: true, master: true },
);
assert.deepStrictEqual(
  isComplimentaryProxyOrder({
    razorpayOrderId: "order_proxy_master_1",
    mode: "master_test_free",
    masterFree: false,
  }),
  { demo: false, master: false },
  "master-free verify must not accept a complimentary order for a non-allowlisted account",
);
assert.deepStrictEqual(
  isComplimentaryProxyOrder({ razorpayOrderId: "order_live_rzp", mode: "razorpay", masterFree: true }),
  { demo: false, master: false },
);

const allow = (email) => String(email || "").toLowerCase() === "priyanagpal16@gmail.com";
assert.strictEqual(resolveMasterFreeUser({ jwtEmail: "priyanagpal16@gmail.com", isAllowlisted: allow, production: true }), true);
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "",
  dbEmail: "priyanagpal16@gmail.com",
  production: true,
  isAllowlisted: allow,
}), true, "DB email must grant master-free in production");
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "advocate@example.com",
  dbEmail: "advocate@example.com",
  production: true,
  demoEmail: "priyanagpal16@gmail.com",
  isAllowlisted: allow,
}), false, "production must not use demoStore email");
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "",
  production: true,
  demoEmail: "priyanagpal16@gmail.com",
  isAllowlisted: allow,
}), false, "missing DB lookup must not throw or grant via demo in production");
assert.strictEqual(clientSafeErrorDetail(new Error("Local demo storage is disabled in production.")), null);

const posting = {
  fields: {
    appearanceType: "Pass-over",
    cnr: "DL1234567890",
    roomNo: "216",
    itemNo: "13",
    passoverScript: "state v Ankit Dwarka passover court no. 216",
    hearingDate: "2026-09-05",
    urgency: "standard",
    timingTier: "standard",
    slaAfterAssign: "Next business day",
    urgencyLabel: "Standard",
  },
};

const complimentaryTask = buildProxyMissionRecord({
  authUser: { id: "11111111-1111-4111-8111-111111111111", name: "priya nagpal" },
  posting,
  fee: 499,
  title: "Pass-over · DL1234567890",
  court: "dwarka",
  complimentary: { demo: true, master: true },
  razorpayOrderId: "order_proxy_master_1",
  razorpayPaymentId: "pay_dev_1",
});

assert.strictEqual(complimentaryTask.mode, "master_test_free");
assert.strictEqual(complimentaryTask.masterTestFree, true);
assert.strictEqual(complimentaryTask.paymentVerified, true);
assert.strictEqual(complimentaryTask.escrowStatus, "Locked");
assert.strictEqual(isWorkHoldActive(complimentaryTask), true, "master-free posting must be assignable");

const paidTask = buildProxyMissionRecord({
  authUser: { id: "11111111-1111-4111-8111-111111111111" },
  posting,
  fee: 499,
  title: "Pass-over · DL1234567890",
  court: "dwarka",
  complimentary: { demo: false, master: false },
  razorpayOrderId: "order_live_1",
  razorpayPaymentId: "pay_live_1",
});
assert.strictEqual(paidTask.mode, "razorpay");
assert.strictEqual(paidTask.paymentVerified, true);
assert.strictEqual(isWorkHoldActive(paidTask), true);

assert.strictEqual(isUndefinedColumnError({ code: "42703", message: 'column "proof_status" does not exist' }), true);
assert.strictEqual(isUndefinedColumnError({ code: "23502", message: "not null" }), false);
assert.ok(safeErrorDetail(new Error("column proof_status does not exist")).includes("proof_status"));

async function withMockDb(queryImpl) {
  const calls = [];
  const db = {
    dbAvailable: true,
    async query(sql, params) {
      calls.push({ sql, params });
      return queryImpl(sql, params, calls);
    },
  };
  return { db, calls };
}

(async () => {
  const { db, calls } = await withMockDb(async (sql) => {
    if (/ALTER TABLE/.test(sql)) return { rows: [] };
    if (/proof_status/.test(sql) && /INSERT/.test(sql)) {
      const error = new Error('column "proof_status" does not exist');
      error.code = "42703";
      throw error;
    }
    return { rows: [{ id: "task-row-1", title: complimentaryTask.title }] };
  });
  const result = await insertProxyMission(db, complimentaryTask);
  assert.equal(result.rows[0].id, "task-row-1");
  assert.ok(calls.some((call) => /INSERT/.test(call.sql) && !/proof_status/.test(call.sql)), "retries insert without proof_status");

  console.log("proxy-hub-post.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
