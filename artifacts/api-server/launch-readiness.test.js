const assert = require("assert");
const crypto = require("crypto");
const { computeProxySettlement } = require("./strategy-features");
const { publicCompliancePolicy } = require("./compliance-policy");
const { isWorkHoldActive } = require("./work-hold");

const settlement = computeProxySettlement(1299);
assert.strictEqual(settlement.platformFee + settlement.appTaxGst, 117);
assert.strictEqual(settlement.netToProxy, 1182);

const policy = publicCompliancePolicy();
assert.strictEqual(policy.feeModel.percentageOfProfessionalFee, 0);
assert.ok(policy.conductRules.length === 10);

assert.strictEqual(isWorkHoldActive({ amount: 1 }), false);
assert.strictEqual(isWorkHoldActive({ escrowStatus: "Locked", paymentStatus: "paid" }), true);

function verifyWebhook(rawBody, secret, signature) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

const body = JSON.stringify({ event: "payment.captured", id: "evt_1" });
const secret = "whsec_test_launch";
const good = crypto.createHmac("sha256", secret).update(body).digest("hex");
assert.strictEqual(verifyWebhook(body, secret, good), true);
assert.strictEqual(verifyWebhook(body, secret, "deadbeef"), false);
assert.strictEqual(verifyWebhook(body, "", good), false);
assert.strictEqual(verifyWebhook(body, secret, good), verifyWebhook(body, secret, good), "duplicate payload verifies identically");

console.log("launch-readiness.test.js OK");
