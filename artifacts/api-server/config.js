const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, ".env"),
    path.join(__dirname, "..", "..", ".env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  }
}

function optionalString(name, fallback = "") {
  return process.env[name] || fallback;
}

function optionalNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number.`);
  }
  return value;
}

function validateUrl(name, value, required = false) {
  if (value === "*") return value;
  if (!value) {
    if (required) throw new Error(`${name} is required.`);
    return value;
  }
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

function parseAllowedOrigins(value, fallbackOrigin) {
  const raw = value || fallbackOrigin || "*";
  if (raw === "*") return ["*"];
  return raw
    .split(",")
    .map((item) => validateUrl("ALLOWED_ORIGINS", item.trim()))
    .filter(Boolean);
}

loadDotEnv();

const fallbackPublicUrl = "https://legal-connect-7ewz.onrender.com";
const configuredPublicUrl = validateUrl("PUBLIC_APP_URL", optionalString("PUBLIC_APP_URL") || optionalString("APP_URL") || fallbackPublicUrl);

const config = {
  nodeEnv: optionalString("NODE_ENV", "development"),
  port: optionalNumber("PORT", 3000),
  allowedOrigin: validateUrl("ALLOWED_ORIGIN", optionalString("ALLOWED_ORIGIN", "*")),
  allowedOrigins: parseAllowedOrigins(optionalString("ALLOWED_ORIGINS"), optionalString("ALLOWED_ORIGIN", "*")),
  appUrl: validateUrl("APP_URL", optionalString("APP_URL") || configuredPublicUrl),
  publicAppUrl: configuredPublicUrl,
  dbUrl: optionalString("DATABASE_URL") || optionalString("DB_URL"),
  redisUrl: optionalString("REDIS_URL"),
  sendgridKey: optionalString("SENDGRID_KEY"),
  webPushPublicKey: optionalString("WEB_PUSH_PUBLIC_KEY"),
  webPushPrivateKey: optionalString("WEB_PUSH_PRIVATE_KEY"),
  razorpayKeyId: optionalString("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optionalString("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: optionalString("RAZORPAY_WEBHOOK_SECRET") || optionalString("WEBHOOK_SECRET"),
  /** Merchant UPI VPA for direct QR. No hardcoded production default. */
  upiVpa: optionalString("LEGAL_CONNECT_UPI_VPA") || optionalString("UPI_VPA") || "",
  upiPayeeName: optionalString("LEGAL_CONNECT_UPI_NAME", "Legal Connect"),
  dataEncryptionKey: optionalString("DATA_ENCRYPTION_KEY"),
  pgSslCa: optionalString("PGSSL_CA"),
  emailProvider: optionalString("EMAIL_PROVIDER"),
  sendgridApiKey: optionalString("SENDGRID_API_KEY") || optionalString("SENDGRID_KEY"),
  resendApiKey: optionalString("RESEND_API_KEY"),
  fromEmail: optionalString("FROM_EMAIL"),
  supportEmail: optionalString("SUPPORT_EMAIL", "legalconnect0s@gmail.com"),
  supportPhone: optionalString("SUPPORT_PHONE") || optionalString("PUBLIC_SUPPORT_PHONE"),
  sosPhone: optionalString("SOS_PHONE") || optionalString("LEGAL_SOS_PHONE"),
  whatsappNumber: optionalString("WHATSAPP_SUPPORT_NUMBER") || optionalString("SUPPORT_WHATSAPP_NUMBER"),
  playReviewEnabled: optionalString("PLAY_REVIEW_ENABLED", "false").toLowerCase() === "true",
  /** Extra production latch — both this and PLAY_REVIEW_ENABLED must be true in production. */
  playReviewAllowProduction: optionalString("PLAY_REVIEW_ALLOW_PRODUCTION", "false").toLowerCase() === "true",
  playReviewEmail: optionalString("PLAY_REVIEW_EMAIL"),
  playReviewCode: optionalString("PLAY_REVIEW_CODE"),
  /** ISO timestamp; when set, Play review access auto-disables after this time. */
  playReviewExpiresAt: optionalString("PLAY_REVIEW_EXPIRES_AT"),
  /** Production wipe kill-switch. Must be exactly "true" to allow POST /api/admin/reset-operational-data. */
  allowOperationalReset: optionalString("ALLOW_OPERATIONAL_RESET", "false").toLowerCase() === "true",
  /**
   * Master operator multi-portal login.
   * Production default: OFF. Requires ALLOW_MASTER_TEST_LOGIN=true AND MASTER_TEST_PASSWORD.
   * Non-production default: ON only when MASTER_TEST_PASSWORD is set.
   */
  allowMasterTestLogin: (() => {
    const raw = optionalString("ALLOW_MASTER_TEST_LOGIN", "");
    const hasPassword = Boolean(optionalString("MASTER_TEST_PASSWORD"));
    if (optionalString("NODE_ENV", "development") === "production") {
      return raw.toLowerCase() === "true" && hasPassword;
    }
    if (raw) return raw.toLowerCase() !== "false" && hasPassword;
    return hasPassword;
  })(),
  /**
   * Emails that get all paid features free (ProxyHub, advisory, chamber).
   * Comma-separated via MASTER_FREE_EMAILS; merged with built-in family allowlist.
   */
  masterFreeEmails: optionalString("MASTER_FREE_EMAILS"),
  twilioAccountSid: optionalString("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: optionalString("TWILIO_AUTH_TOKEN"),
  twilioFromNumber: optionalString("TWILIO_FROM_NUMBER"),
  twilioWhatsappFrom: optionalString("TWILIO_WHATSAPP_FROM") || optionalString("TWILIO_WHATSAPP_NUMBER"),
  cloudinaryCloudName: optionalString("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: optionalString("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: optionalString("CLOUDINARY_API_SECRET"),
};

if (config.nodeEnv === "production") {
  const missing = [];
  if (!config.dbUrl) missing.push("DATABASE_URL or DB_URL");
  if (!(process.env.SESSION_SECRET || process.env.JWT_SECRET)) {
    missing.push("SESSION_SECRET (or JWT_SECRET), dedicated random value >= 32 characters");
  } else if (String(process.env.SESSION_SECRET || process.env.JWT_SECRET || "").length < 32) {
    console.warn("SESSION_SECRET/JWT_SECRET is shorter than 32 characters; rotate to a longer random secret.");
  }
  if (!config.allowedOrigins.length || config.allowedOrigins.includes("*")) {
    const locked = [config.publicAppUrl, config.appUrl, "https://legal-connect.in", "https://www.legal-connect.in"]
      .filter(Boolean)
      .map((item) => String(item).replace(/\/$/, ""));
    config.allowedOrigins = [...new Set(locked)];
    config.allowedOrigin = config.allowedOrigins[0];
    console.warn("Production CORS locked to app allowlist because ALLOWED_ORIGINS was missing or set to *.");
  }
  if (missing.length) {
    throw new Error(`Production config incomplete: ${missing.join("; ")}`);
  }
}

module.exports = config;
