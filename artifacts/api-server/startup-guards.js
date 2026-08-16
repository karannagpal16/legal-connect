/**
 * Production startup guards — refuse unsafe configuration.
 */

function assertSafeProductionConfig(config, env = process.env) {
  const errors = [];
  const warnings = [];

  if (config.nodeEnv !== "production") {
    return { ok: true, errors, warnings };
  }

  if (config.allowMasterTestLogin) {
    errors.push("ALLOW_MASTER_TEST_LOGIN must be false in production.");
  }
  if (config.allowOperationalReset) {
    errors.push("ALLOW_OPERATIONAL_RESET must be false in production.");
  }
  if (String(env.ALLOW_DEMO_AUTH || "").toLowerCase() === "true") {
    errors.push("ALLOW_DEMO_AUTH must not be enabled in production.");
  }
  if (!config.dbUrl) {
    errors.push("DATABASE_URL is required in production.");
  }
  const sessionSecret = String(env.SESSION_SECRET || env.JWT_SECRET || "");
  if (sessionSecret.length < 32) {
    errors.push("SESSION_SECRET/JWT_SECRET must be at least 32 characters.");
  }
  if (/changeme|secret123|legal-connect-dev/i.test(sessionSecret)) {
    errors.push("SESSION_SECRET appears to be a placeholder — rotate before launch.");
  }
  if (!config.razorpayWebhookSecret && config.razorpayKeyId) {
    warnings.push("RAZORPAY_WEBHOOK_SECRET is missing while Razorpay keys are set.");
  }
  if (String(env.BUILTIN_MASTER_FREE || "").toLowerCase() === "true") {
    errors.push("BUILTIN_MASTER_FREE allowlist is forbidden in production.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function enforceStartupGuards(config, { exit = true, log = console } = {}) {
  const result = assertSafeProductionConfig(config);
  for (const warning of result.warnings) log.warn(`[startup-guard] ${warning}`);
  if (!result.ok) {
    for (const error of result.errors) log.error(`[startup-guard] ${error}`);
    if (exit) {
      log.error("[startup-guard] Refusing to start with unsafe production configuration.");
      process.exit(1);
    }
    throw new Error(result.errors.join("; "));
  }
  return result;
}

module.exports = {
  assertSafeProductionConfig,
  enforceStartupGuards,
};
