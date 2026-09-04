/**
 * Production fail-closed helpers.
 * Demo memory must never serve live traffic; a disconnected database must
 * 503 API work except a small public allowlist used for liveness and policy.
 */

const DEMO_STORE_DISABLED_MESSAGE = "Local demo storage is disabled in production.";

const DB_OPTIONAL_API_PATHS = new Set([
  "/api/healthz",
  "/api/health",
  "/health",
  "/api/app-version",
  "/api/support-routing",
  "/api/legal-dictionary",
  "/api/compliance/policy",
  "/api/payments/config",
]);

function isDbOptionalApiPath(pathname) {
  return DB_OPTIONAL_API_PATHS.has(String(pathname || ""));
}

function isDemoStoreDisabledError(error) {
  const message = String(error?.message || error || "");
  return message.includes(DEMO_STORE_DISABLED_MESSAGE);
}

function demoMemory(nodeEnv, store) {
  if (String(nodeEnv) === "production") return null;
  return store || null;
}

module.exports = {
  DEMO_STORE_DISABLED_MESSAGE,
  DB_OPTIONAL_API_PATHS,
  isDbOptionalApiPath,
  isDemoStoreDisabledError,
  demoMemory,
};
