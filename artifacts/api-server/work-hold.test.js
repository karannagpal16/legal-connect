const assert = require("assert");
const { isWorkHoldActive } = require("./work-hold");

assert.strictEqual(
  isWorkHoldActive({ amount: 1299 }),
  false,
  "a posted amount without a locked hold is not assignable",
);

assert.strictEqual(
  isWorkHoldActive({ escrowStatus: "Locked", razorpayPaymentId: "pay_live_1" }),
  true,
  "locked hold plus verified payment is assignable",
);

assert.strictEqual(
  isWorkHoldActive({ escrow_status: "held", payment_status: "paid" }),
  true,
  "held + paid is assignable",
);

assert.strictEqual(
  isWorkHoldActive({ escrowStatus: "Open", amount: 799, paymentVerified: false }),
  false,
  "open board with an amount is not a hold",
);

assert.strictEqual(
  isWorkHoldActive({ escrowStatus: "Locked", mode: "master_test_free" }),
  true,
  "complimentary locked missions remain assignable",
);

assert.strictEqual(
  isWorkHoldActive({ escrowStatus: "Released", razorpayPaymentId: "pay_x" }),
  false,
  "released holds are not assignable",
);

console.log("work-hold.test.js OK");
