const assert = require("assert");
const {
  encryptBuffer,
  decryptBuffer,
  timingSafeEqualString,
  rateLimit,
  resolveSessionSecret,
} = require("./security");

process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const plain = Buffer.from("confidential case note");
const encrypted = encryptBuffer(plain);
assert.ok(!encrypted.equals(plain), "ciphertext must differ from plaintext");
assert.ok(decryptBuffer(encrypted).equals(plain), "round-trip decrypt must restore plaintext");
assert.ok(decryptBuffer(plain).equals(plain), "legacy plaintext buffers remain readable");

assert.strictEqual(timingSafeEqualString("abc", "abc"), true);
assert.strictEqual(timingSafeEqualString("abc", "abd"), false);

const first = rateLimit("test-bucket", { windowMs: 60_000, max: 2 });
const second = rateLimit("test-bucket", { windowMs: 60_000, max: 2 });
const third = rateLimit("test-bucket", { windowMs: 60_000, max: 2 });
assert.strictEqual(first.allowed, true);
assert.strictEqual(second.allowed, true);
assert.strictEqual(third.allowed, false);

const localSecret = resolveSessionSecret({ nodeEnv: "development" });
assert.ok(localSecret.length > 10);

let threw = false;
try {
  const prev = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  delete process.env.JWT_SECRET;
  resolveSessionSecret({ nodeEnv: "production" });
  process.env.SESSION_SECRET = prev;
} catch {
  threw = true;
}
assert.strictEqual(threw, true, "production must require dedicated session secret");

console.log("security.test.js OK");
