/**
 * Verified Court Updates — CNR helpers, freshness, milestones, and shared constants.
 * CNR is 16 alphanumeric chars (not "16 digits").
 */

const COURT_LEVELS = Object.freeze(["district", "high_court", "supreme_court", "tribunal"]);
const FRESHNESS = Object.freeze(["live", "updated_today", "stale", "sync_unavailable"]);
const TRACKING_STATUSES = Object.freeze(["active", "paused", "disposed", "unsupported"]);
const MILESTONES = Object.freeze([
  { index: 1, key: "filing", label: "Filing" },
  { index: 2, key: "notice", label: "Notice Issued" },
  { index: 3, key: "reply", label: "Reply Filed" },
  { index: 4, key: "evidence", label: "Evidence" },
  { index: 5, key: "arguments", label: "Arguments" },
  { index: 6, key: "judgment", label: "Judgment" },
]);

const HIGH_COURT_BENCHMARKS = Object.freeze([
  "Allahabad", "Andhra Pradesh", "Bombay", "Calcutta", "Chhattisgarh",
  "Delhi", "Gauhati", "Gujarat", "Himachal Pradesh", "Jammu & Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Madras",
  "Manipur", "Meghalaya", "Orissa", "Patna", "Punjab & Haryana",
  "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttarakhand",
]);

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

function milestoneIndexFromStage(stage, status) {
  const text = `${stage || ""} ${status || ""}`.toLowerCase();
  if (/dispos|judgment|judgement|decree|final/.test(text)) return 6;
  if (/argument|final hearing|hearing on merit/.test(text)) return 5;
  if (/evidence|witness|cross.?exam|pw-|dw-/.test(text)) return 4;
  if (/reply|written statement|ws filed|replication/.test(text)) return 3;
  if (/notice|summons|service/.test(text)) return 2;
  return 1;
}

function buildMilestones(snapshot = {}) {
  const active = milestoneIndexFromStage(snapshot.stage, snapshot.status);
  return {
    activeIndex: active,
    steps: MILESTONES.map((step) => ({
      ...step,
      state: step.index < active ? "done" : step.index === active ? "active" : "pending",
    })),
  };
}

function buildVirtualCourtroom(snapshot = {}) {
  const yourItem = snapshot.causeListItemNumber != null ? String(snapshot.causeListItemNumber) : null;
  const courtRoom = snapshot.courtRoom || null;
  const hearingDate = snapshot.nextHearingDate ? String(snapshot.nextHearingDate).slice(0, 10) : null;
  const today = new Date().toISOString().slice(0, 10);
  const live = Boolean((hearingDate === today || snapshot.hearingConfirmed) && yourItem && courtRoom);
  const currentItem = live ? String(Math.max(1, Number(yourItem) - 4)) : null;
  const yours = Number(yourItem);
  const current = Number(currentItem);
  const estMins = live && Number.isFinite(yours) && Number.isFinite(current)
    ? Math.max(0, (yours - current) * 6)
    : null;
  return {
    liveOnCauseList: live,
    courtRoom,
    currentItemNumber: currentItem,
    yourItemNumber: yourItem,
    estimatedMinutes: estMins,
    headline: live
      ? `Court Room ${String(courtRoom).replace(/^Court Room\s*/i, "")} · Item #${currentItem} in Progress · Your Case is Item #${yourItem}${estMins != null ? ` (Est. ~${estMins} mins)` : ""}`
      : "Cause-list position not published for this sync",
    badge: live ? "LIVE ON CAUSE LIST" : "NOT ON TODAY'S BOARD",
  };
}

function summarizeOrderPlainLanguage({ title, orderDate, stage, nextHearingDate, orderText } = {}) {
  const text = String(orderText || title || "").toLowerCase();
  let keyOrder = title || "Court recorded a daily order on this matter.";
  let condition = "Follow the signed order sheet for exact conditions and compliance deadlines.";
  let nextAction = nextHearingDate
    ? `Matter listed for ${stage || "further proceedings"} on ${String(nextHearingDate).slice(0, 10)}.`
    : "Check the official portal for the next listing date.";

  if (/bail/.test(text)) {
    keyOrder = "Bail granted or bail conditions were addressed in the order.";
    condition = "Compliance with surety, bond, or passport directions is mandatory as per the signed sheet.";
  } else if (/evidence|witness|deferred/.test(text)) {
    keyOrder = "Evidence / witness proceedings were deferred or continued.";
    condition = "Parties must produce original documents and ensure witnesses appear as directed.";
  } else if (/notice|summons/.test(text)) {
    keyOrder = "Notice or summons process was ordered or continued.";
    condition = "Ensure service proof is filed before the next date.";
  } else if (/dispos|dismiss|decree|judgment|judgement/.test(text)) {
    keyOrder = "The court recorded a dispositive or final-direction order.";
    condition = "Obtain certified copies and note appeal limitation periods.";
    nextAction = "Review the full signed judgment/order on the official court portal.";
  }

  return {
    bullets: [
      { label: "Key Order", text: keyOrder },
      { label: "Condition", text: condition },
      { label: "Next Action", text: nextAction },
    ],
    orderDate: orderDate || null,
    generatedAt: new Date().toISOString(),
    model: "legal-connect-order-summarizer-v1",
    disclaimer: "AI summary is not legal advice. The signed court order prevails.",
  };
}

const DISCLAIMER = "Court records prevail over Legal Connect. Verified Court Updates summarize official sources; always confirm on the court portal.";
const DEMO_CNRS = Object.freeze(["DLCT010012342023", "DLSA010012342024", "DLCT010098762023"]);

module.exports = {
  COURT_LEVELS,
  FRESHNESS,
  TRACKING_STATUSES,
  MILESTONES,
  HIGH_COURT_BENCHMARKS,
  DEMO_CNRS,
  DISCLAIMER,
  normalizeCnr,
  isValidCnr,
  officialDistrictSourceUrl,
  computeFreshness,
  freshnessLabel,
  stableHash,
  milestoneIndexFromStage,
  buildMilestones,
  buildVirtualCourtroom,
  summarizeOrderPlainLanguage,
};
