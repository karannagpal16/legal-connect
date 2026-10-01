const assert = require("node:assert/strict");
const {
  getChamberPlan,
  quoteChamberPlan,
  quoteFromPaidOrder,
  assertMemberSeat,
  chamberPlanCatalog,
  isTopTierPlan,
} = require("./chamber-plans");

const catalog = chamberPlanCatalog();
assert.equal(catalog.length, 3);
assert.deepEqual(catalog.map((plan) => plan.amount), [999, 2499, 4999]);
assert.deepEqual(catalog.map((plan) => plan.annualAmount), [9999, 24999, 49999]);
assert.equal(catalog.find((plan) => plan.popular).id, "pro");
assert.equal(catalog.every((plan) => plan.maxOpenTasks == null), true);

assert.equal(getChamberPlan("growth").id, "pro");
assert.equal(getChamberPlan("chambers_plus").id, "elite");
assert.equal(getChamberPlan("core").seniorSeats, 2);
assert.equal(getChamberPlan("core").teamSeats, 6);
assert.equal(isTopTierPlan("chambers_plus"), true);
assert.equal(isTopTierPlan("core"), false);

const monthly = quoteChamberPlan("pro", "monthly");
assert.equal(monthly.chargeAmount, 2499);
assert.equal(monthly.periodDays, 30);
const annual = quoteChamberPlan("elite", "annual");
assert.equal(annual.chargeAmount, 49999);
assert.equal(annual.periodDays, 365);
assert.equal(annual.billingCycle, "annual");

const core = getChamberPlan("core");
assert.equal(assertMemberSeat(core, [], "associate").ok, true);
assert.equal(assertMemberSeat(core, [], "senior").ok, true);
const sixTeam = Array.from({ length: 6 }, () => ({ member_role: "associate" }));
assert.equal(assertMemberSeat(core, sixTeam, "intern").ok, false);
assert.equal(assertMemberSeat(core, sixTeam, "senior").ok, true);
const oneSenior = [{ member_role: "partner" }];
assert.equal(assertMemberSeat(core, oneSenior, "senior").ok, false);
assert.match(assertMemberSeat(core, oneSenior, "partner").error, /Senior\/Partner/);

const paidAnnual = quoteFromPaidOrder({
  receipt: "ch_pro_yr_1750000000000",
  amount: 2499900,
  notes: { planId: "pro", billingCycle: "annual" },
});
assert.equal(paidAnnual.ok, true);
assert.equal(paidAnnual.quoted.id, "pro");
assert.equal(paidAnnual.quoted.billingCycle, "annual");
assert.equal(paidAnnual.quoted.chargeAmount, 24999);

const fromReceiptOnly = quoteFromPaidOrder({
  receipt: "ch_elite_mo_1750000000000",
  amount: 499900,
});
assert.equal(fromReceiptOnly.quoted.id, "elite");
assert.equal(fromReceiptOnly.quoted.periodDays, 30);

const mismatch = quoteFromPaidOrder({
  receipt: "ch_core_mo_1750000000000",
  amount: 499900,
  notes: { planId: "core", billingCycle: "monthly" },
});
assert.equal(mismatch.ok, false);

const conflict = quoteFromPaidOrder({
  receipt: "ch_core_mo_1",
  notes: { planId: "elite", billingCycle: "monthly" },
  amount: 99900,
});
assert.equal(conflict.ok, false);

const demo = quoteFromPaidOrder({ id: "order_chamber_demo_core_annual_1750000000000" });
assert.equal(demo.ok, true);
assert.equal(demo.quoted.id, "core");
assert.equal(demo.quoted.chargeAmount, 9999);
assert.equal(quoteFromPaidOrder({ id: "order_chamber_demo_annual_1" }).ok, false);

console.log("chamber-plans.test.js ok");
