const assert = require("assert");
const {
  canPostProxyMission,
  isComplimentaryProxyOrder,
  safeErrorDetail,
  clientSafeErrorDetail,
  isDatabaseError,
  proxyRequestRef,
  proxyPaymentLogContext,
  createPaymentInFlightGuard,
  findProxyMissionByPaymentId,
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

const allow = (email) => String(email || "").toLowerCase() === "family-tester@example.com";
assert.strictEqual(resolveMasterFreeUser({ jwtEmail: "family-tester@example.com", isAllowlisted: allow, production: true }), true);
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "",
  dbEmail: "family-tester@example.com",
  production: true,
  isAllowlisted: allow,
}), true, "DB email must grant master-free in production");
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "advocate@example.com",
  dbEmail: "advocate@example.com",
  production: true,
  demoEmail: "family-tester@example.com",
  isAllowlisted: allow,
}), false, "production must not use demoStore email");
assert.strictEqual(resolveMasterFreeUser({
  jwtEmail: "",
  production: true,
  demoEmail: "family-tester@example.com",
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

// PostgreSQL / driver errors must never reach the browser; business errors still may.
{
  const pgError = Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
    code: "23505", severity: "ERROR", constraint: "users_email_key", detail: "Key (email)=(client@example.com) already exists.",
  });
  assert.strictEqual(isDatabaseError(pgError), true);
  assert.strictEqual(clientSafeErrorDetail(pgError), null);
  assert.strictEqual(clientSafeErrorDetail(Object.assign(new Error('relation "tasks" does not exist'), { code: "42P01" })), null);
  assert.strictEqual(clientSafeErrorDetail(Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432"), { code: "ECONNREFUSED" })), null);
  assert.strictEqual(clientSafeErrorDetail(new Error("password authentication failed for user \"lc_app\"")), null);
  assert.strictEqual(clientSafeErrorDetail(new Error("Database is not available.")), null);
  assert.strictEqual(clientSafeErrorDetail(Object.assign(new Error("write EPIPE"), { code: "EPIPE" })), "write EPIPE");
  assert.strictEqual(clientSafeErrorDetail(new Error("The amount must be at least INR 1.00")), "The amount must be at least INR 1.00");
}

// Reconciliation log context: ids only, never signatures; complimentary orders carry no payment ids.
{
  const ctx = proxyPaymentLogContext({ requestId: "abc", orderId: "order_1", paymentId: "pay_1", userId: 7, taskId: 9, stage: "insert_mission", signature: "SHOULD_NOT_APPEAR" });
  assert.deepStrictEqual(ctx, { requestId: "abc", stage: "insert_mission", orderId: "order_1", paymentId: "pay_1", userId: "7", taskId: "9" });
  const demoCtx = proxyPaymentLogContext({ requestId: "r", orderId: "order_proxy_demo_1", paymentId: "pay_demo", complimentary: true });
  assert.strictEqual(demoCtx.orderId, null);
  assert.strictEqual(demoCtx.paymentId, null);
  assert.match(proxyRequestRef(require("crypto").randomBytes), /^[0-9a-f]{12}$/);
}

// In-flight guard: a payment id can be held once at a time and is released after.
{
  const guard = createPaymentInFlightGuard();
  assert.strictEqual(guard.acquire("pay_1"), true);
  assert.strictEqual(guard.acquire("pay_1"), false, "concurrent duplicate blocked");
  assert.strictEqual(guard.acquire("pay_2"), true);
  guard.release("pay_1");
  assert.strictEqual(guard.acquire("pay_1"), true, "released key can be reacquired");
  assert.strictEqual(guard.acquire(null), true, "no key = no guard");
  guard.release(null);
  assert.strictEqual(guard.size(), 2);
}

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

  // Duplicate-payment lookup: DB path queries by payment id; demo path scans tasks.
  {
    const { db: lookupDb, calls: lookupCalls } = await withMockDb(async (_sql, params) => (
      params[0] === "pay_SEEN" ? { rows: [{ id: "task-row-9", posted_by: "adv-1" }] } : { rows: [] }
    ));
    const found = await findProxyMissionByPaymentId({ db: lookupDb, paymentId: "pay_SEEN" });
    assert.equal(found.row.id, "task-row-9");
    assert.ok(/payload->>'razorpayPaymentId' = \$1/.test(lookupCalls[0].sql), "parameterised lookup by payment id");
    assert.equal(await findProxyMissionByPaymentId({ db: lookupDb, paymentId: "pay_NEW" }), null);
    assert.equal(await findProxyMissionByPaymentId({ db: lookupDb, paymentId: "" }), null);
    assert.equal(lookupCalls.length, 2, "blank payment id never queries");
    const demoFound = await findProxyMissionByPaymentId({ db: { dbAvailable: false }, demoTasks: [{ id: "t1", razorpayPaymentId: "pay_X" }], paymentId: "pay_X" });
    assert.equal(demoFound.task.id, "t1");
  }

  console.log("proxy-hub-post.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Production must never honour demo order ids (they would skip payment verification).
assert.deepStrictEqual(
  isComplimentaryProxyOrder({ razorpayOrderId: "order_proxy_demo_1", masterFree: false, production: true }),
  { demo: false, master: false },
);
