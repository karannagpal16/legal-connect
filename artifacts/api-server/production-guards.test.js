const assert = require("assert");
const {
  DEMO_STORE_DISABLED_MESSAGE,
  isDbOptionalApiPath,
  isDemoStoreDisabledError,
  demoMemory,
} = require("./production-guards");

assert.strictEqual(isDbOptionalApiPath("/api/healthz"), true);
assert.strictEqual(isDbOptionalApiPath("/api/health"), true);
assert.strictEqual(isDbOptionalApiPath("/api/compliance/policy"), true);
assert.strictEqual(isDbOptionalApiPath("/api/payments/config"), true);
assert.strictEqual(isDbOptionalApiPath("/api/tasks"), false);
assert.strictEqual(isDbOptionalApiPath("/api/consultations/book-advisory"), false);
assert.strictEqual(isDbOptionalApiPath("/api/auth/login"), false);

assert.strictEqual(isDemoStoreDisabledError(new Error(DEMO_STORE_DISABLED_MESSAGE)), true);
assert.strictEqual(isDemoStoreDisabledError(new Error("Payment gateway order creation failed.")), false);
assert.strictEqual(isDemoStoreDisabledError(null), false);

assert.strictEqual(demoMemory("production", { tasks: [1] }), null);
assert.deepStrictEqual(demoMemory("development", { tasks: [1] }), { tasks: [1] });

console.log("production-guards.test.js OK");
