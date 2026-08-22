const assert = require("assert");
const {
  PLATFORM_SERVICE_FEE,
  PLATFORM_CHARGE_TOTAL_INR,
  PROHIBITED_PRACTICES,
  CONDUCT_RULES,
  computePlatformServiceCharge,
  publicCompliancePolicy,
} = require("./compliance-policy");
const { computeProxySettlement, RULE36_PATTERNS, PROXY_URGENCY_TIERS } = require("./strategy-features");

// The platform charge must be identical across mission values: it is a flat fee,
// not a share of the advocate's professional fee.
const tiers = Object.values(PROXY_URGENCY_TIERS).map((tier) => computeProxySettlement(tier.fee));
const platformCharges = new Set(tiers.map((row) => row.platformFee + row.appTaxGst));
assert.strictEqual(platformCharges.size, 1, "platform charge must not vary with the mission fee");
assert.strictEqual([...platformCharges][0], PLATFORM_CHARGE_TOTAL_INR);

// Every rupee collected is either the advocate's professional fee or the disclosed platform charge.
for (const row of tiers) {
  assert.strictEqual(
    row.professionalFee + row.platformFee + row.appTaxGst,
    row.gross,
    "settlement must account for the full collected amount",
  );
  assert.strictEqual(row.netToProxy, row.professionalFee);
}

// A higher professional fee must not increase Legal Connect revenue.
const small = computeProxySettlement(499);
const large = computeProxySettlement(50_000);
assert.strictEqual(small.platformFee, large.platformFee, "revenue must be independent of the professional fee");
assert.ok(large.professionalFee > small.professionalFee);

// Free/zero missions must never produce a negative payout.
const zero = computeProxySettlement(0);
assert.strictEqual(zero.professionalFee, 0);
assert.strictEqual(zero.platformFee, 0);
const belowFee = computePlatformServiceCharge(40);
assert.strictEqual(belowFee.professionalFee, 0);
assert.strictEqual(belowFee.serviceFee, 40, "platform charge is capped at the amount actually collected");

// No settlement field may express Legal Connect revenue as a percentage of the fee.
const settlementKeys = Object.keys(small);
assert.ok(!settlementKeys.includes("platformFeePct"), "settlement must not publish a platform fee percentage");
assert.ok(!settlementKeys.includes("advocatePct"), "settlement must not publish an advocate fee share percentage");

const policy = publicCompliancePolicy();
assert.strictEqual(policy.feeModel.percentageOfProfessionalFee, 0);
assert.strictEqual(policy.feeModel.serviceFeeInr, PLATFORM_SERVICE_FEE.serviceFeeInr);
assert.strictEqual(policy.conductRules.length, 10, "the ten governance rules must stay published");
assert.strictEqual(policy.prohibitedPractices, PROHIBITED_PRACTICES);
assert.strictEqual(policy.conductRules, CONDUCT_RULES);
assert.ok(policy.verification.prohibitedLabels.includes("Verified lawyer"));

// Rule 36 content guard: solicitation and superlative copy must be rejected.
const blocked = [
  "Hire the best lawyer in Delhi",
  "Top advocate for cheque bounce matters",
  "Our success rate is unmatched",
  "Sponsored advocate listing available",
  "Pay per lead for new briefs",
  "BCI approved platform",
  "guaranteed outcome in three hearings",
];
for (const copy of blocked) {
  assert.ok(
    RULE36_PATTERNS.some((pattern) => pattern.test(copy)),
    `Rule 36 guard must block: ${copy}`,
  );
}

const allowed = [
  "Appearance on 12 March before the Patiala House Courts",
  "Hearing update submitted within 4 hours",
  "Enrolment document checked on 3 February",
  "Matter management and MIS reporting for the panel your team appointed",
];
for (const copy of allowed) {
  assert.ok(
    !RULE36_PATTERNS.some((pattern) => pattern.test(copy)),
    `Rule 36 guard must allow operational copy: ${copy}`,
  );
}

console.log("compliance-policy.test.js OK");
