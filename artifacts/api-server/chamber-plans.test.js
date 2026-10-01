const assert = require("node:assert/strict");
const {
  getChamberPlan,
  quoteChamberPlan,
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

console.log("chamber-plans.test.js ok");
