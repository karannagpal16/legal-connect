const assert = require("assert");
const crypto = require("crypto");
const {
  BOOKING_PREFIX,
  MERCHANT_CODE,
  STATUSES,
  EVENTS,
  LEGS,
  DEFAULT_AUTO_APPROVAL_HOURS,
  clampAutoApprovalHours,
  buildBookingId,
  buildSettlementSplit,
  buildSplitLegs,
  buildRefundLeg,
  canReleaseLock,
  armAutoApprovalAt,
  signWebhookBody,
  verifyWebhookSignature,
  buildWebhookEnvelope,
  attachLockToTask,
  bookingPatchFromEvent,
  SETTLEMENT_AGREEMENT,
  createSettlementLedger,
} = require("./settlement-ledger");

assert.strictEqual(clampAutoApprovalHours(12), 24);
assert.strictEqual(clampAutoApprovalHours(72), 48);
assert.strictEqual(clampAutoApprovalHours(36), 36);
assert.strictEqual(clampAutoApprovalHours("nope"), DEFAULT_AUTO_APPROVAL_HOURS);

const bookingId = buildBookingId(new Date("2026-09-04T07:00:00Z"));
assert.ok(bookingId.startsWith(`${BOOKING_PREFIX}-20260904-`));
assert.notStrictEqual(buildBookingId(), buildBookingId());

const standard = buildSettlementSplit(499);
assert.strictEqual(standard.proxyhubShare, 117);
assert.strictEqual(standard.proxyShare, 382);
assert.strictEqual(standard.proxyhubShare + standard.proxyShare, 499);
assert.ok(!/%|percent/i.test(standard.note));

const large = buildSettlementSplit(1299);
assert.strictEqual(large.proxyhubShare, 117, "ProxyHub share stays the flat technology fee");
assert.strictEqual(large.proxyShare, 1182);

const { settlement, legs, complimentary } = buildSplitLegs({
  collected: 499,
  merchantAccountId: "acc_proxyhub",
  proxyUserId: "adv_proxy",
  payerUserId: "adv_poster",
});
assert.strictEqual(complimentary, false);
assert.strictEqual(legs.length, 2);
assert.strictEqual(legs[0].leg, LEGS.PROXYHUB_COMMISSION);
assert.strictEqual(legs[0].amount, 117);
assert.strictEqual(legs[0].beneficiaryType, "proxyhub_merchant");
assert.strictEqual(legs[1].leg, LEGS.PROXY_FEE);
assert.strictEqual(legs[1].amount, 382);
assert.strictEqual(legs[0].amount + legs[1].amount, settlement.gross);
assert.ok(legs.every((leg) => leg.leg !== "gross_to_proxyhub"));

const free = buildSplitLegs({ collected: 499, complimentary: true });
assert.strictEqual(free.complimentary, true);
assert.deepStrictEqual(free.legs, []);

const refund = buildRefundLeg({ collected: 499, payerUserId: "adv_poster" });
assert.strictEqual(refund.legs.length, 1);
assert.strictEqual(refund.legs[0].leg, LEGS.ADVOCATE_REFUND);
assert.strictEqual(refund.legs[0].amount, 499);
assert.strictEqual(refund.legs[0].beneficiaryType, "payer");

const locked = { status: STATUSES.LOCKED };
assert.strictEqual(canReleaseLock(locked, { proofStatus: "poster_approved" }).ok, true);
assert.strictEqual(canReleaseLock(locked, { posterDecision: "ok" }).reason, "advocate_approved");
assert.strictEqual(canReleaseLock(locked, { proofStatus: "submitted" }).ok, false);

const autoAt = armAutoApprovalAt(new Date("2026-09-04T00:00:00Z"), 36);
assert.strictEqual(autoAt, "2026-09-05T12:00:00.000Z");
assert.strictEqual(
  canReleaseLock({ status: STATUSES.LOCKED, autoReleaseAt: autoAt }, { now: new Date("2026-09-05T12:00:00Z") }).reason,
  "auto_approval",
);
assert.strictEqual(canReleaseLock({ status: STATUSES.DISPUTED }, { posterDecision: "ok" }).ok, false);
assert.strictEqual(canReleaseLock({ status: STATUSES.RELEASED }).idempotent, true);
assert.strictEqual(canReleaseLock({ status: STATUSES.REFUNDED }).ok, false);

const secret = "whsec_test_settlement";
const envelope = buildWebhookEnvelope({
  event: EVENTS.PAYMENT_LOCKED,
  lock: {
    bookingId: "LCBK-20260904-AAAA",
    taskId: "task-1",
    status: STATUSES.LOCKED,
    collected: 499,
    proxyhubShare: 117,
    proxyShare: 382,
  },
  extra: { occurredAt: "2026-09-04T07:00:00.000Z" },
});
assert.strictEqual(envelope.payload.event, "payment_locked");
assert.strictEqual(envelope.payload.merchant, MERCHANT_CODE);
assert.strictEqual(envelope.payload.split.proxyhub_commission, 117);
const signature = signWebhookBody(envelope.rawBody, secret);
assert.strictEqual(verifyWebhookSignature(envelope.rawBody, signature, secret), true);
assert.strictEqual(verifyWebhookSignature(envelope.rawBody, "deadbeef", secret), false);
assert.strictEqual(verifyWebhookSignature(envelope.rawBody, signature, ""), false);

const attached = attachLockToTask(
  { id: "task-1", title: "Pass-over", amount: 499, escrowStatus: "Locked" },
  { bookingId: "LCBK-1", taskId: "task-1", status: STATUSES.LOCKED, collected: 499, proxyhubShare: 117, proxyShare: 382 },
);
assert.strictEqual(attached.bookingId, "LCBK-1");
assert.strictEqual(attached.lockedPayment.status, STATUSES.LOCKED);
assert.strictEqual(attached.settlementPreview.proxyShare, 382);
assert.strictEqual(attached.lockedPayment.settlementAgreement, SETTLEMENT_AGREEMENT);

const lockedPatch = bookingPatchFromEvent({ event: "payment_locked", task_id: "t1", booking_id: "LCBK-1" });
assert.strictEqual(lockedPatch.escrowStatus, "Locked");
assert.strictEqual(lockedPatch.paymentLockStatus, STATUSES.LOCKED);
const releasedPatch = bookingPatchFromEvent({ event: "released", booking_id: "LCBK-1" });
assert.strictEqual(releasedPatch.escrowStatus, "Released");

async function runLedger() {
  const applied = [];
  const ledger = createSettlementLedger({
    config: { settlementAutoApprovalHours: 36, proxyhubWebhookSecret: secret },
    onVerifiedEvent: async (payload) => { applied.push(payload.event); },
  });
  const lockedPay = await ledger.lockPayment({
    taskId: "task-live-1",
    payerUserId: "poster-1",
    collected: 499,
    complimentary: false,
    razorpayPaymentId: "pay_test_1",
  });
  assert.strictEqual(lockedPay.lock.status, STATUSES.LOCKED);
  assert.ok(lockedPay.lock.bookingId.startsWith(BOOKING_PREFIX));
  const again = await ledger.lockPayment({ taskId: "task-live-1", payerUserId: "poster-1", collected: 499 });
  assert.strictEqual(again.idempotent, true);

  const armed = await ledger.armAutoApproval("task-live-1");
  assert.ok(armed.autoReleaseAt);

  const tooSoon = await ledger.releaseSplit({ id: "task-live-1", proofStatus: "submitted" });
  assert.strictEqual(tooSoon.ok, false);

  const released = await ledger.releaseSplit({
    id: "task-live-1",
    proofStatus: "poster_approved",
    acceptedBy: "proxy-1",
  });
  assert.strictEqual(released.ok, true);
  assert.strictEqual(released.lock.status, STATUSES.RELEASED);
  assert.strictEqual(released.settlement.proxyhubShare, 117);
  assert.strictEqual(released.splits.length, 2);
  assert.ok(released.splits.every((row) => row.leg !== "gross"));

  const refundBlocked = await ledger.refundLock({ id: "task-live-1" });
  assert.strictEqual(refundBlocked.ok, false);

  const complimentary = await ledger.lockPayment({
    taskId: "task-free-1",
    payerUserId: "poster-1",
    collected: 499,
    complimentary: true,
  });
  assert.strictEqual(complimentary.lock.collected, 0);
  const freeRelease = await ledger.releaseSplit({
    id: "task-free-1",
    proofStatus: "poster_approved",
    acceptedBy: "proxy-1",
  });
  assert.strictEqual(freeRelease.ok, true);

  const disputed = await ledger.lockPayment({
    taskId: "task-dispute-1",
    payerUserId: "poster-1",
    collected: 799,
  });
  const opened = await ledger.disputeLock({ id: disputed.lock.taskId }, { actor: "poster-1", reason: "Appearance not as instructed" });
  assert.strictEqual(opened.lock.status, STATUSES.DISPUTED);
  const cannotRelease = await ledger.releaseSplit({ id: "task-dispute-1", proofStatus: "poster_approved" });
  assert.strictEqual(cannotRelease.ok, false);
  const refunded = await ledger.refundLock({ id: "task-dispute-1" }, { actor: "admin", reason: "Counsel disputed appearance" });
  assert.strictEqual(refunded.lock.status, STATUSES.REFUNDED);

  const autoTask = await ledger.lockPayment({
    taskId: "task-auto-1",
    payerUserId: "poster-1",
    collected: 499,
  });
  autoTask.lock.autoReleaseAt = new Date(Date.now() - 1000).toISOString();
  const due = await ledger.processDueAutoApprovals(async () => ({
    id: "task-auto-1",
    proofStatus: "lc_verified",
    acceptedBy: "proxy-9",
  }));
  assert.strictEqual(due[0].ok, true);
  assert.strictEqual(due[0].reason, "auto_approval");

  const merchant = await ledger.getMerchantAccount();
  assert.strictEqual(merchant.code || MERCHANT_CODE, MERCHANT_CODE);

  await ledger.upsertPayoutAccount({
    userId: "proxy-1",
    holderName: "Priya Nagpal",
    accountNumber: "123456789012",
    ifsc: "HDFC0001234",
  });
  const payout = await ledger.getPayoutAccount("proxy-1");
  assert.strictEqual(payout.bankAccountLast4, "9012");
  assert.strictEqual(payout.bankIfsc, "HDFC0001234");

  const [enriched] = await ledger.attachLocksToTasks([{ id: "task-live-1", amount: 499 }]);
  assert.strictEqual(enriched.lockedPayment.status, STATUSES.RELEASED);

  assert.ok(applied.includes("payment_locked"));
  assert.ok(applied.includes("released"));
  assert.ok(applied.includes("disputed"));
  assert.ok(applied.includes("refunded"));

  const replay = await ledger.consumeVerifiedEvent(envelope.rawBody, signature);
  assert.strictEqual(replay.ok, true);
  const replayAgain = await ledger.consumeVerifiedEvent(envelope.rawBody, signature);
  assert.strictEqual(replayAgain.idempotent, true);
  const forged = await ledger.consumeVerifiedEvent(envelope.rawBody, "00".repeat(32));
  assert.strictEqual(forged.ok, false);

  const queued = await ledger.processQueuedPayouts();
  assert.ok(Array.isArray(queued));
}

runLedger().then(() => {
  const hmac = crypto.createHmac("sha256", "x").update("{}").digest("hex");
  assert.ok(hmac);
  console.log("settlement-ledger.test.js OK");
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
