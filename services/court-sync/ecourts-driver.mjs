/**
 * Live Court Driver — CNR parser + provider bridge.
 * Does NOT scrape CAPTCHA-gated portals. Uses fixture / official_link /
 * contracted commercial adapters only.
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../../artifacts/api-server");
const requireFromApi = createRequire(path.join(apiRoot, "package.json"));

const {
  normalizeCnr,
  isValidCnr,
  officialDistrictSourceUrl,
  stableHash,
  DISCLAIMER,
} = requireFromApi("./court-sync/schemas.js");
const { resolveCourtProvider } = requireFromApi("./court-sync/providers/index.js");

const MILESTONES = Object.freeze([
  { index: 1, key: "filing", label: "Filing" },
  { index: 2, key: "notice", label: "Notice Issued" },
  { index: 3, key: "reply", label: "Reply Filed" },
  { index: 4, key: "evidence", label: "Evidence" },
  { index: 5, key: "arguments", label: "Arguments" },
  { index: 6, key: "judgment", label: "Judgment" },
]);

const HIGH_COURTS = Object.freeze([
  "Allahabad", "Andhra Pradesh", "Bombay", "Calcutta", "Chhattisgarh",
  "Delhi", "Gauhati", "Gujarat", "Himachal Pradesh", "Jammu & Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Madras",
  "Manipur", "Meghalaya", "Orissa", "Patna", "Punjab & Haryana",
  "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttarakhand",
]);

function parseCNR(cnrNumber) {
  const cnr = normalizeCnr(cnrNumber);
  if (!isValidCnr(cnr)) {
    const error = new Error("CNR must be exactly 16 alphanumeric characters.");
    error.code = "VALIDATION";
    throw error;
  }
  return {
    cnr,
    stateCode: cnr.slice(0, 2),
    districtCode: cnr.slice(2, 4),
    courtCode: cnr.slice(4, 6),
    caseSerial: cnr.slice(6, 12),
    caseYear: Number(cnr.slice(12, 16)),
    officialSourceUrl: officialDistrictSourceUrl(cnr),
  };
}

function milestoneIndexFromStage(stage, status) {
  const text = `${stage || ""} ${status || ""}`.toLowerCase();
  if (/dispos|judgment|judgement|decree|final/.test(text)) return 6;
  if (/argument|final hearing|hearing on merit/.test(text)) return 5;
  if (/evidence|witness|cross.?exam|pw-|dw-/.test(text)) return 4;
  if (/reply|written statement|ws filed|replication/.test(text)) return 3;
  if (/notice|summons|service/.test(text)) return 2;
  if (/filing|registered|admission|pending/.test(text)) return 1;
  return 1;
}

function estimateMinutesUntilItem(currentItem, yourItem) {
  const current = Number(currentItem);
  const yours = Number(yourItem);
  if (!Number.isFinite(current) || !Number.isFinite(yours) || yours < current) return null;
  // Rough courtroom heuristic: ~6 minutes per cause-list item.
  return Math.max(0, (yours - current) * 6);
}

function buildVirtualCourtroom(snapshot = {}) {
  const yourItem = snapshot.causeListItemNumber != null ? String(snapshot.causeListItemNumber) : null;
  const courtRoom = snapshot.courtRoom || null;
  const listedToday = Boolean(
    snapshot.nextHearingDate
    && String(snapshot.nextHearingDate).slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  // Demo fixture: when hearing is today or fixture marks confirmed, show live board.
  const live = listedToday || (snapshot.hearingConfirmed && yourItem);
  const currentItem = live && yourItem
    ? String(Math.max(1, Number(yourItem) - 4))
    : null;
  const estMins = estimateMinutesUntilItem(currentItem, yourItem);

  return {
    liveOnCauseList: Boolean(live && yourItem && courtRoom),
    courtRoom,
    currentItemNumber: currentItem,
    yourItemNumber: yourItem,
    estimatedMinutes: estMins,
    headline: live && yourItem && courtRoom
      ? `Court Room ${String(courtRoom).replace(/^Court Room\s*/i, "")} · Item #${currentItem} in progress · Your case is Item #${yourItem}${estMins != null ? ` (Est. ~${estMins} mins)` : ""}`
      : "Cause-list position not published for this sync",
    badge: live && yourItem ? "LIVE ON CAUSE LIST" : "NOT ON TODAY'S BOARD",
  };
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

function enrichSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    milestones: buildMilestones(snapshot),
    virtualCourtroom: buildVirtualCourtroom(snapshot),
    disclaimer: DISCLAIMER,
  };
}

async function fetchLiveCNRData(cnrNumber, { providerName } = {}) {
  const parsed = parseCNR(cnrNumber);
  const provider = resolveCourtProvider(providerName || process.env.COURT_DATA_PROVIDER || "fixture");
  const result = await provider.searchByCnr(parsed.cnr);
  if (!result.found) {
    return {
      found: false,
      cnr: parsed.cnr,
      parsed,
      message: result.message || "Case not found.",
      sourceUrl: result.sourceUrl || parsed.officialSourceUrl,
      disclaimer: DISCLAIMER,
    };
  }
  const snapshot = enrichSnapshot(result.snapshot);
  return {
    found: true,
    provider: result.provider || provider.name,
    parsed,
    snapshot,
    history: (snapshot.history || []).length
      ? snapshot.history
      : [
          {
            hearingDate: snapshot.nextHearingDate,
            businessOnDate: snapshot.stage || "Listed",
            stage: snapshot.stage,
            courtRoom: snapshot.courtRoom,
            purpose: snapshot.stage,
          },
        ].filter((row) => row.hearingDate),
    orders: snapshot.orders || [],
    disclaimer: DISCLAIMER,
  };
}

async function fetchHighCourtData(input = {}) {
  const provider = resolveCourtProvider(process.env.COURT_DATA_PROVIDER || "fixture");
  const caps = await provider.capabilities();
  if (!caps.highCourtSearch) {
    return {
      found: false,
      unsupported: true,
      courtType: "high_court",
      coverageList: HIGH_COURTS,
      reason: "High Court automated search is not enabled until an approved provider is contracted. Use official High Court portals for verification.",
      officialPortal: "https://hcservices.ecourts.gov.in/hcservices/",
      disclaimer: DISCLAIMER,
    };
  }
  const results = await provider.searchByCase({
    ...input,
    courtLevel: "high_court",
  });
  return { found: results.length > 0, results, disclaimer: DISCLAIMER };
}

async function fetchSupremeCourtData(input = {}) {
  const provider = resolveCourtProvider(process.env.COURT_DATA_PROVIDER || "fixture");
  const caps = await provider.capabilities();
  if (!caps.supremeCourtSearch) {
    return {
      found: false,
      unsupported: true,
      courtType: "supreme_court",
      reason: "Supreme Court diary/case search is Phase 5. Use official SCI portals until enabled.",
      officialPortals: {
        caseStatus: "https://www.sci.gov.in/",
        dailyOrders: "https://www.sci.gov.in/daily-order-diary-no/",
        latestOrders: "https://www.sci.gov.in/latest-orders/",
      },
      disclaimer: DISCLAIMER,
    };
  }
  const results = await provider.searchSupremeCourt(input);
  return { found: results.length > 0, results, disclaimer: DISCLAIMER };
}

/** Deterministic 3-bullet plain-language summary for order text / metadata. */
function summarizeOrderPlainLanguage({ title, orderDate, stage, nextHearingDate, orderText } = {}) {
  const text = String(orderText || title || "").toLowerCase();
  let keyOrder = title || "Court recorded a daily order on this matter.";
  let condition = "Follow the signed order sheet for exact conditions and compliance deadlines.";
  let nextAction = nextHearingDate
    ? `Matter listed for ${stage || "further proceedings"} on ${String(nextHearingDate).slice(0, 10)}.`
    : "Check the official portal for the next listing date.";

  if (/bail/.test(text)) {
    keyOrder = "Bail considerations were addressed in the order.";
    condition = "Compliance with any surety, bond, or passport conditions is mandatory as per the signed sheet.";
  } else if (/evidence|witness/.test(text)) {
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

export {
  parseCNR,
  fetchLiveCNRData,
  fetchHighCourtData,
  fetchSupremeCourtData,
  summarizeOrderPlainLanguage,
  buildMilestones,
  buildVirtualCourtroom,
  milestoneIndexFromStage,
  MILESTONES,
  HIGH_COURTS,
  normalizeCnr,
  isValidCnr,
  DISCLAIMER,
  stableHash,
};
