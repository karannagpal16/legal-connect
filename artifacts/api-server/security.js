/**
 * Shared security helpers for Legal Connect API.
 * Field encryption, rate limiting, and response hardening.
 */
const crypto = require("crypto");

const AUTH_CACHE = new WeakMap();
const RATE_BUCKETS = new Map();

const ENC_PREFIX = "lc1:";

function isProduction(nodeEnv) {
  return String(nodeEnv || process.env.NODE_ENV || "").toLowerCase() === "production";
}

function resolveSessionSecret({ nodeEnv, razorpayWebhookSecret, dbUrl } = {}) {
  const dedicated = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
  if (dedicated && dedicated.length >= 32) return dedicated;
  if (isProduction(nodeEnv)) {
    throw new Error(
      "SESSION_SECRET (or JWT_SECRET) must be set to a dedicated random value of at least 32 characters in production. Do not reuse DATABASE_URL or webhook secrets.",
    );
  }
  // Local/dev only — never use DB URL or payment secrets as session material.
  if (dedicated) return dedicated;
  return "legal-connect-local-session-secret-dev-only";
}

function encryptionKeyBytes() {
  const raw = process.env.DATA_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptBuffer(plain) {
  const key = encryptionKeyBytes();
  if (!key || plain == null) return plain;
  const input = Buffer.isBuffer(plain) ? plain : Buffer.from(plain);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(ENC_PREFIX), iv, tag, encrypted]);
}

function decryptBuffer(stored) {
  if (stored == null) return stored;
  const buf = Buffer.isBuffer(stored) ? stored : Buffer.from(stored);
  const prefix = Buffer.from(ENC_PREFIX);
  if (buf.length < prefix.length + 12 + 16 || !buf.subarray(0, prefix.length).equals(prefix)) {
    // Legacy plaintext rows remain readable until re-encrypted on next write.
    return buf;
  }
  const key = encryptionKeyBytes();
  if (!key) return buf;
  const iv = buf.subarray(prefix.length, prefix.length + 12);
  const tag = buf.subarray(prefix.length + 12, prefix.length + 28);
  const data = buf.subarray(prefix.length + 28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function encryptText(value) {
  if (value == null || value === "") return value;
  const encrypted = encryptBuffer(Buffer.from(String(value), "utf8"));
  return encrypted.toString("base64");
}

function decryptText(value) {
  if (value == null || value === "") return value;
  try {
    const buf = Buffer.from(String(value), "base64");
    return decryptBuffer(buf).toString("utf8");
  } catch {
    return value;
  }
}

function clientIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req?.socket?.remoteAddress || "unknown";
}

function rateLimit(key, { windowMs = 60_000, max = 20 } = {}) {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || now > bucket.resetAt) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: max - bucket.count, retryAfterSeconds: 0 };
}

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-site",
    "Cache-Control": extra.cacheControl || "no-store",
    ...extra,
  };
}

function applySecurityHeaders(res, extra = {}) {
  const headers = securityHeaders(extra);
  for (const [key, value] of Object.entries(headers)) {
    if (value != null && !res.getHeader?.(key) && !res.headersSent) {
      try {
        res.setHeader(key, value);
      } catch {
        /* response may already be committed */
      }
    }
  }
}

function setAuthUser(req, user) {
  AUTH_CACHE.set(req, user || null);
}

function getCachedAuthUser(req) {
  return AUTH_CACHE.has(req) ? AUTH_CACHE.get(req) : undefined;
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    const dummy = crypto.createHash("sha256").update(left).digest();
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function redactSecrets(value) {
  return String(value || "")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
    .replace(/(api[_-]?key|secret|password|token|authorization)\s*[:=]\s*["']?[^"'\\s]+/gi, "$1=[redacted]");
}

module.exports = {
  ENC_PREFIX,
  resolveSessionSecret,
  encryptBuffer,
  decryptBuffer,
  encryptText,
  decryptText,
  clientIp,
  rateLimit,
  securityHeaders,
  applySecurityHeaders,
  setAuthUser,
  getCachedAuthUser,
  timingSafeEqualString,
  redactSecrets,
  isProduction,
};
