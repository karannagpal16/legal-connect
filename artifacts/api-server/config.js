const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const candidates = [
    path.join(process.cwd(), ".env"),
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

loadDotEnv();

const config = {
  nodeEnv: optionalString("NODE_ENV", "development"),
  port: optionalNumber("PORT", 3000),
  allowedOrigin: validateUrl("ALLOWED_ORIGIN", optionalString("ALLOWED_ORIGIN", "*")),
  dbUrl: optionalString("DB_URL"),
  redisUrl: optionalString("REDIS_URL"),
  sendgridKey: optionalString("SENDGRID_KEY"),
  webPushPublicKey: optionalString("WEB_PUSH_PUBLIC_KEY"),
  webPushPrivateKey: optionalString("WEB_PUSH_PRIVATE_KEY"),
  razorpayKeyId: optionalString("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optionalString("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: optionalString("RAZORPAY_WEBHOOK_SECRET") || optionalString("WEBHOOK_SECRET"),
  emailProvider: optionalString("EMAIL_PROVIDER"),
  sendgridApiKey: optionalString("SENDGRID_API_KEY") || optionalString("SENDGRID_KEY"),
  resendApiKey: optionalString("RESEND_API_KEY"),
  fromEmail: optionalString("FROM_EMAIL"),
};

if (config.nodeEnv === "production") {
  const warnings = [];
  if (!config.dbUrl) warnings.push("DB_URL");
  if (!config.allowedOrigin || config.allowedOrigin === "*") warnings.push("ALLOWED_ORIGIN");
  if (warnings.length) {
    console.warn(`Production config warning: ${warnings.join(", ")} not configured. Running demo-safe mode.`);
  }
}

module.exports = config;
