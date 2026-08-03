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
  /** Merchant UPI VPA for direct QR. Env overrides this default. */
  upiVpa: optionalString("LEGAL_CONNECT_UPI_VPA") || optionalString("UPI_VPA") || "7982871464@ptaxis",
  upiPayeeName: optionalString("LEGAL_CONNECT_UPI_NAME", "Legal Connect"),
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
   * Master card (karannagpal16@gmail.com) multi-portal login.
   * Production default: OFF. Set ALLOW_MASTER_TEST_LOGIN=true to re-enable.
   * Non-production default: ON for local/dev.
   */
  allowMasterTestLogin: (() => {
    const raw = optionalString("ALLOW_MASTER_TEST_LOGIN", "");
    if (raw) return raw.toLowerCase() !== "false";
    return optionalString("NODE_ENV", "development") !== "production";
  })(),
  twilioAccountSid: optionalString("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: optionalString("TWILIO_AUTH_TOKEN"),
  twilioFromNumber: optionalString("TWILIO_FROM_NUMBER"),
  twilioWhatsappFrom: optionalString("TWILIO_WHATSAPP_FROM") || optionalString("TWILIO_WHATSAPP_NUMBER"),
  cloudinaryCloudName: optionalString("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: optionalString("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: optionalString("CLOUDINARY_API_SECRET"),
};

if (config.nodeEnv === "production") {
  const warnings = [];
  if (!config.dbUrl) warnings.push("DATABASE_URL or DB_URL");
  if (!config.allowedOrigins.length || config.allowedOrigins.includes("*")) warnings.push("ALLOWED_ORIGINS");
  if (warnings.length) {
    console.warn(`Production config warning: ${warnings.join(", ")} not configured. Production startup will fail until required settings are added.`);
  }
}

module.exports = config;
