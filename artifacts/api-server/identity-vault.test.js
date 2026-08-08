process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.SESSION_SECRET = "local-dev-session-secret-at-least-32-chars!!";

const assert = require("assert");
const {
  normalizeCredentialValue,
  validateCredential,
  maskCredential,
  createIdentityVault,
} = require("./identity-vault");

assert.strictEqual(normalizeCredentialValue("aadhaar", "1234-5678-9012"), "123456789012");
assert.strictEqual(validateCredential("aadhaar", "123456789012"), "");
assert.ok(validateCredential("aadhaar", "123"));
assert.strictEqual(maskCredential("aadhaar", "9012"), "XXXX XXXX 9012");
assert.strictEqual(maskCredential("bar_enrollment", "2020"), "•••• 2020");

const calls = [];
const fakeDb = {
  dbAvailable: true,
  async query(text, params = []) {
    calls.push({ text, params });
    if (/CREATE TABLE|CREATE INDEX/i.test(text)) return { rows: [] };
    if (/INSERT INTO identity_credentials_vault/i.test(text)) {
      return {
        rows: [{
          id: "11111111-1111-1111-1111-111111111111",
          user_id: params[0],
          credential_kind: params[1],
          reference_last4: params[4],
          status: "sealed",
          label: params[5],
          deposited_at: new Date().toISOString(),
          rotated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      };
    }
    if (/INSERT INTO identity_vault_access_log/i.test(text)) return { rows: [] };
    return { rows: [] };
  },
};

const vault = createIdentityVault({ db: fakeDb, config: {}, writeAuditLog: async () => undefined });
(async () => {
  const deposited = await vault.depositCredential({
    userId: "22222222-2222-2222-2222-222222222222",
    kind: "aadhaar",
    value: "123456789012",
  });
  assert.strictEqual(deposited.ok, true);
  assert.strictEqual(deposited.last4, "9012");
  assert.strictEqual(deposited.entry.masked, "XXXX XXXX 9012");
  const insert = calls.find((item) => /INSERT INTO identity_credentials_vault/i.test(item.text));
  assert.ok(insert, "expected vault insert");
  assert.ok(String(insert.params[2] || "").length > 20, "ciphertext should be stored");
  console.log("identity-vault.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
