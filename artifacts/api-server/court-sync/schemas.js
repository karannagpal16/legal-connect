/**
 * Verified Court Updates — CNR helpers, freshness, and shared constants.
 * CNR is 16 alphanumeric chars (not "16 digits").
 */

const COURT_LEVELS = Object.freeze(["district", "high_court", "supreme_court", "tribunal"]);
const FRESHNESS = Object.freeze(["live", "updated_today", "stale", "sync_unavailable"]);
const TRACKING_STATUSES = Object.freeze(["active", "paused", "disposed", "unsupported"]);

function normalizeCnr(raw) {
  return String(raw || "").replace(/[\s-]/g, "").toUpperCase();
}

function isValidCnr(raw) {
  const cnr = normalizeCnr(raw);
  return /^[A-Z0-9]{16}$/.test(cnr);
}

function officialDistrictSourceUrl(cnr) {
  const value = normalizeCnr(cnr);
  // Public status entry point — never fetch arbitrary user URLs (SSRF).
  return `https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index&cnr=${encodeURIComponent(value)}`;
}

function computeFreshness({ lastSuccessAt, lastSyncStatus, trackingStatus } = {}) {
  if (trackingStatus === "unsupported" || lastSyncStatus === "unsupported") return "sync_unavailable";
  if (!lastSuccessAt) return "sync_unavailable";
  if (String(lastSyncStatus || "").toLowerCase().includes("fail")) {
    const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 36 * 3600 * 1000) return "sync_unavailable";
    return "stale";
  }
  const successMs = new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(successMs)) return "sync_unavailable";
  const ageMs = Date.now() - successMs;
  if (ageMs <= 2 * 3600 * 1000) return "live";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  if (successMs >= startOfDay.getTime()) return "updated_today";
  if (ageMs <= 36 * 3600 * 1000) return "stale";
  return "sync_unavailable";
}

function freshnessLabel(value) {
  switch (value) {
    case "live": return "Live";
    case "updated_today": return "Updated today";
    case "stale": return "Stale";
    default: return "Sync unavailable";
  }
}

function stableHash(payload) {
  const crypto = require("crypto");
  const normalized = JSON.stringify(payload, Object.keys(payload || {}).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

const DISCLAIMER = "Court records prevail over Legal Connect. Verified Court Updates summarize official sources; always confirm on the court portal.";

module.exports = {
  COURT_LEVELS,
  FRESHNESS,
  TRACKING_STATUSES,
  DISCLAIMER,
  normalizeCnr,
  isValidCnr,
  officialDistrictSourceUrl,
  computeFreshness,
  freshnessLabel,
  stableHash,
};
