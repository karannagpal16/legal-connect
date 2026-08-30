/**
 * Work Completion Hold — assignment gate.
 * A mission may be assigned only when funds are locked AND payment is verified,
 * or when a complimentary (master-free) posting has been recorded. Amount alone
 * is not enough: a posted fee without a hold is not a paid mission.
 */

function isComplimentaryHold(task = {}) {
  const mode = String(task.mode || task.paymentMode || task.payment_mode || "").toLowerCase();
  return Boolean(
    task.masterTestFree
    || task.master_test_free
    || mode === "master_test_free"
    || mode === "first_chat_free",
  );
}

function isWorkHoldActive(task = {}) {
  const escrow = String(task.escrowStatus || task.escrow_status || "").toLowerCase();
  const paymentStatus = String(task.paymentStatus || task.payment_status || "").toLowerCase();
  const locked = /lock|held/.test(escrow);
  const paid = Boolean(
    task.paymentVerified
    || task.razorpayPaymentId
    || task.razorpay_payment_id
    || /paid|captured|verified/.test(paymentStatus),
  );
  if (isComplimentaryHold(task) && (locked || paid)) return true;
  return locked && paid;
}

module.exports = {
  isComplimentaryHold,
  isWorkHoldActive,
};
