const test = require("node:test");
const assert = require("node:assert/strict");
const authz = require("../authorization");
const { quoteProduct, PROXY_MIN_FEE_INR, resolveProductId } = require("../products");
const { canTransition, assertTransition, MACHINES } = require("../workflow-states");
const { assertSafeProductionConfig } = require("../startup-guards");

test("RNA normalizes to admin and never advocate", () => {
  assert.equal(authz.normalizeRole("rna"), "admin");
  assert.equal(authz.isOps({ role: "rna" }), true);
  assert.equal(authz.isAdvocateVerified({ role: "rna", verificationStatus: "approved" }), false);
});

test("admin capability roles are scoped", () => {
  assert.equal(authz.hasAdminCapability({ role: "finance_admin" }, "finance"), true);
  assert.equal(authz.hasAdminCapability({ role: "finance_admin" }, "verification"), false);
  assert.equal(authz.hasAdminCapability({ role: "content_reviewer" }, "content"), true);
  assert.equal(authz.hasAdminCapability({ role: "super_admin" }, "finance"), true);
});

test("resource ownership policies", () => {
  const owner = { id: "u1", role: "client" };
  const other = { id: "u2", role: "advocate", verificationStatus: "approved" };
  const admin = { id: "a1", role: "operations_admin" };
  const matter = { id: "c1", userId: "u1", assignedTo: "u2" };
  const booking = { id: "b1", userId: "u1", assignedAdvocateId: "u2" };
  const task = { id: "t1", postedBy: "u2", acceptedBy: "u3" };

  assert.equal(authz.canViewCase(owner, matter), true);
  assert.equal(authz.canViewCase(other, matter), true);
  assert.equal(authz.canViewCase({ id: "x", role: "advocate", verificationStatus: "approved" }, matter), false);
  assert.equal(authz.canViewCase(admin, matter), true);

  assert.equal(authz.canViewBooking(owner, booking), true);
  assert.equal(authz.canViewBooking({ id: "x", role: "client" }, booking), false);
  assert.equal(authz.canAcceptIntake(other, booking), true);
  assert.equal(authz.canAcceptIntake({ id: "x", role: "advocate", verificationStatus: "approved" }, booking), false);

  assert.equal(authz.canViewTask(other, task), true);
  assert.equal(authz.canPerformProxyStep({ id: "u3", role: "advocate", verificationStatus: "approved" }, task, "check_in"), true);
  assert.equal(authz.canPerformProxyStep(other, task, "check_in"), false);
});

test("blocked advocates cannot use workspace", () => {
  assert.equal(authz.isAdvocateBlocked({ role: "advocate", verificationStatus: "pending" }), true);
  assert.equal(authz.isAdvocateBlocked({ role: "advocate", verificationStatus: "suspended" }), true);
  assert.equal(authz.isAdvocateBlocked({ role: "advocate", verificationStatus: "approved" }), false);
  assert.throws(() => authz.assertNotBlockedAdvocate({ role: "advocate", verificationStatus: "rejected" }));
});

test("products ignore client amounts and unify ProxyHub fees", () => {
  const quote = quoteProduct({ productId: "proxy_standard", amount: 1 });
  assert.equal(quote.amountInr, 499);
  assert.equal(PROXY_MIN_FEE_INR, 499);
  assert.equal(resolveProductId({ urgency: "urgent" }), "proxy_urgent");
  assert.equal(quoteProduct({ channel: "chat" }).amountInr, 99);
  assert.throws(() => quoteProduct({ productId: "fake_product" }));
});

test("canonical state machines reject illegal transitions", () => {
  assert.equal(canTransition("paid_intake", "paid", "lc_review"), true);
  assert.equal(canTransition("paid_intake", "intake_submitted", "lc_under_review"), true);
  assert.equal(canTransition("paid_intake", "lc_under_review", "advocate_assigned"), true);
  assert.equal(canTransition("paid_intake", "advocate_accepted", "concluded"), true);
  assert.equal(canTransition("paid_intake", "draft", "settled"), false);
  assert.throws(() => assertTransition("proxy_hub", "draft", "paid_out"));
  assert.equal(canTransition("advocate_verification", "pending", "under_review"), true);
  assert.ok(MACHINES.case_update.pending_review.includes("approved"));
  assert.ok(MACHINES.chamber_subscription.paid.includes("active"));
});

test("production startup guards refuse unsafe config", () => {
  const bad = assertSafeProductionConfig(
    {
      nodeEnv: "production",
      allowMasterTestLogin: true,
      allowOperationalReset: false,
      dbUrl: "postgres://x",
      razorpayKeyId: "rzp",
      razorpayWebhookSecret: "",
    },
    { SESSION_SECRET: "short", ALLOW_DEMO_AUTH: "true", BUILTIN_MASTER_FREE: "true" },
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /ALLOW_MASTER_TEST_LOGIN/.test(e)));
  assert.ok(bad.errors.some((e) => /ALLOW_DEMO_AUTH/.test(e)));

  const good = assertSafeProductionConfig(
    {
      nodeEnv: "production",
      allowMasterTestLogin: false,
      allowOperationalReset: false,
      dbUrl: "postgres://x",
      razorpayKeyId: "",
      razorpayWebhookSecret: "",
    },
    { SESSION_SECRET: "a".repeat(40), ALLOW_DEMO_AUTH: "false" },
  );
  assert.equal(good.ok, true);
});

test("finance capability is required for money actions", () => {
  assert.equal(authz.canPerformFinanceAction({ role: "finance_admin" }, "refund"), true);
  assert.equal(authz.canPerformFinanceAction({ role: "operations_admin" }, "refund"), false);
  assert.equal(authz.canPerformFinanceAction({ role: "content_reviewer" }, "release_payment"), false);
  assert.equal(authz.canPerformFinanceAction({ role: "admin" }, "release_payment"), true);
});

test("proxy fee catalog matches urgency tiers", () => {
  assert.equal(quoteProduct({ urgency: "standard" }).amountInr, 499);
  assert.equal(quoteProduct({ urgency: "priority" }).amountInr, 799);
  assert.equal(quoteProduct({ urgency: "urgent" }).amountInr, 1299);
  assert.equal(quoteProduct({ channel: "call" }).amountInr, 299);
  assert.equal(quoteProduct({ channel: "video" }).amountInr, 499);
});
