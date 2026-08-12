/**
 * Court data provider adapters.
 * Commercial scraping / CAPTCHA bypass is intentionally unsupported.
 */

const {
  normalizeCnr,
  isValidCnr,
  officialDistrictSourceUrl,
  stableHash,
} = require("../schemas");

function unsupported(capability) {
  const error = new Error(`Provider does not support ${capability}.`);
  error.code = "UNSUPPORTED";
  error.capability = capability;
  throw error;
}

function baseCapabilities(overrides = {}) {
  return {
    provider: "unknown",
    districtCnr: false,
    highCourtSearch: false,
    supremeCourtSearch: false,
    orders: false,
    causeList: false,
    webhooks: false,
    automatedAccess: false,
    notes: "Capability matrix entry.",
    ...overrides,
  };
}

/** Deterministic fixtures for CI / demo — never presented as live court truth without badge. */
function createFixtureCourtProvider() {
  const today = new Date().toISOString().slice(0, 10);
  const fixtures = {
    DLCT010012342023: {
      courtLevel: "district",
      cnr: "DLCT010012342023",
      caseNumber: "CRL/1234/2023",
      caseType: "Criminal",
      caseYear: 2023,
      courtName: "Tis Hazari District Court, Delhi",
      stateCode: "DL",
      districtCode: "CT",
      status: "Pending",
      stage: "Arguments",
      nextHearingDate: today,
      hearingConfirmed: true,
      courtRoom: "Court Room 5",
      causeListItemNumber: "18",
      judgeOrBench: "Ld. MM-03",
      parties: {
        petitioners: ["State"],
        respondents: ["Rohit Malhotra"],
      },
      advocates: ["APP", "Adv. Ayush Kapoor"],
      sourceUrl: officialDistrictSourceUrl("DLCT010012342023"),
      history: [
        { hearingDate: "2026-06-10", businessOnDate: "Charge framed", stage: "Charge", courtRoom: "Court Room 5", purpose: "Charge" },
        { hearingDate: "2026-07-08", businessOnDate: "Prosecution evidence partly recorded", stage: "Evidence", courtRoom: "Court Room 5", purpose: "Evidence" },
        { hearingDate: today, businessOnDate: "Listed for arguments", stage: "Arguments", courtRoom: "Court Room 5", purpose: "Arguments" },
      ],
      orders: [
        {
          id: "ord-fixture-bail",
          title: "Daily order — bail granted subject to surety",
          documentDate: "2026-07-08",
          documentType: "daily_order",
          official: true,
          sourceUrl: "https://services.ecourts.gov.in/",
          orderText: "Bail granted subject to ₹25,000 surety bond. Accused must surrender passport to investigating officer within 48 hours. Matter listed for framing of charges / arguments on next date.",
          fixturePdf: true,
        },
      ],
    },
    DLSA010012342024: {
      courtLevel: "district",
      cnr: "DLSA010012342024",
      caseNumber: "CS/123/2024",
      caseType: "Civil Suit",
      caseYear: 2024,
      courtName: "Saket District Court, Delhi",
      stateCode: "DL",
      districtCode: "SA",
      status: "Pending",
      stage: "Evidence",
      nextHearingDate: "2026-08-18",
      hearingConfirmed: false,
      courtRoom: "Court Room 5",
      causeListItemNumber: "42",
      judgeOrBench: "Ld. ADJ-03",
      parties: {
        petitioners: ["Isha Sharma"],
        respondents: ["Acme Builders Pvt Ltd"],
      },
      advocates: ["Adv. Isha Sharma", "Adv. R. Mehta"],
      sourceUrl: officialDistrictSourceUrl("DLSA010012342024"),
      history: [
        { hearingDate: "2026-05-12", businessOnDate: "Summons issued", stage: "Notice Issued", courtRoom: "Court Room 5", purpose: "Summons" },
        { hearingDate: "2026-06-20", businessOnDate: "Written statement filed", stage: "Reply Filed", courtRoom: "Court Room 5", purpose: "WS" },
        { hearingDate: "2026-08-18", businessOnDate: "Evidence deferred", stage: "Evidence", courtRoom: "Court Room 5", purpose: "Evidence" },
      ],
      orders: [
        {
          id: "ord-fixture-1",
          title: "Daily order — evidence deferred",
          documentDate: "2026-07-02",
          documentType: "daily_order",
          official: true,
          sourceUrl: "https://services.ecourts.gov.in/",
          orderText: "Evidence deferred. Parties to produce original documents. Next date fixed for plaintiff evidence.",
          fixturePdf: true,
        },
      ],
    },
    DLCT010098762023: {
      courtLevel: "district",
      cnr: "DLCT010098762023",
      caseNumber: "CRL/987/2023",
      caseType: "Criminal",
      caseYear: 2023,
      courtName: "Tis Hazari District Court, Delhi",
      stateCode: "DL",
      districtCode: "CT",
      status: "Pending",
      stage: "Arguments",
      nextHearingDate: "2026-08-12",
      hearingConfirmed: true,
      courtRoom: "Court Room 12",
      causeListItemNumber: "7",
      judgeOrBench: "Ld. MM-11",
      parties: {
        petitioners: ["State"],
        respondents: ["Amit Verma"],
      },
      advocates: ["APP", "Adv. Ayush Kapoor"],
      sourceUrl: officialDistrictSourceUrl("DLCT010098762023"),
      history: [
        { hearingDate: "2026-07-01", businessOnDate: "Charge arguments heard in part", stage: "Arguments", courtRoom: "Court Room 12", purpose: "Arguments" },
      ],
      orders: [],
    },
  };

  return {
    name: "fixture",
    async capabilities() {
      return baseCapabilities({
        provider: "fixture",
        districtCnr: true,
        orders: true,
        notes: "Local fixtures for development and CI. Not live court data.",
      });
    },
    async searchByCnr(cnr) {
      const normalized = normalizeCnr(cnr);
      if (!isValidCnr(normalized)) {
        const error = new Error("CNR must be exactly 16 alphanumeric characters.");
        error.code = "VALIDATION";
        throw error;
      }
      const hit = fixtures[normalized];
      if (!hit) {
        return {
          found: false,
          cnr: normalized,
          message: "No fixture case for this CNR. Demo CNRs: DLCT010012342023, DLSA010012342024, DLCT010098762023.",
          sourceUrl: officialDistrictSourceUrl(normalized),
        };
      }
      return {
        found: true,
        provider: "fixture",
        providerCaseId: `fixture:${normalized}`,
        snapshot: {
          ...hit,
          provider: "fixture",
          providerCaseId: `fixture:${normalized}`,
          sourceFetchedAt: new Date().toISOString(),
          payloadHash: stableHash(hit),
        },
      };
    },
    async searchByCase() {
      unsupported("high_court_or_case_search");
    },
    async searchSupremeCourt() {
      unsupported("supreme_court_search");
    },
    async fetchCase(providerCaseId) {
      const cnr = String(providerCaseId || "").replace(/^fixture:/, "");
      const result = await this.searchByCnr(cnr);
      if (!result.found) {
        const error = new Error("Fixture case not found.");
        error.code = "NOT_FOUND";
        throw error;
      }
      return result.snapshot;
    },
    async listOrders(providerCaseId) {
      const snapshot = await this.fetchCase(providerCaseId);
      return snapshot.orders || [];
    },
  };
}

/** Opens official links only — no automated portal fetch. */
function createOfficialLinkProvider() {
  return {
    name: "official_link",
    async capabilities() {
      return baseCapabilities({
        provider: "official_link",
        districtCnr: true,
        notes: "Manual verification via official eCourts / court portals. No automated scrape.",
      });
    },
    async searchByCnr(cnr) {
      const normalized = normalizeCnr(cnr);
      if (!isValidCnr(normalized)) {
        const error = new Error("CNR must be exactly 16 alphanumeric characters.");
        error.code = "VALIDATION";
        throw error;
      }
      return {
        found: true,
        provider: "official_link",
        providerCaseId: `official_link:${normalized}`,
        requiresManualVerification: true,
        snapshot: {
          courtLevel: "district",
          cnr: normalized,
          status: "Pending manual verification",
          stage: null,
          nextHearingDate: null,
          hearingConfirmed: false,
          courtRoom: null,
          causeListItemNumber: null,
          parties: { petitioners: [], respondents: [] },
          advocates: [],
          orders: [],
          provider: "official_link",
          providerCaseId: `official_link:${normalized}`,
          sourceUrl: officialDistrictSourceUrl(normalized),
          sourceFetchedAt: new Date().toISOString(),
          payloadHash: stableHash({ cnr: normalized, mode: "official_link" }),
        },
      };
    },
    async searchByCase() {
      unsupported("case_search");
    },
    async searchSupremeCourt() {
      unsupported("supreme_court_search");
    },
    async fetchCase(providerCaseId) {
      const cnr = String(providerCaseId || "").replace(/^official_link:/, "");
      const result = await this.searchByCnr(cnr);
      return result.snapshot;
    },
    async listOrders() {
      return [];
    },
  };
}

/** Placeholder until a commercial provider is contracted. */
function createCommercialCourtProvider() {
  return {
    name: "commercial",
    async capabilities() {
      return baseCapabilities({
        provider: "commercial",
        notes: "No commercial court API configured. Set COURT_DATA_PROVIDER=fixture|official_link until a vendor is approved.",
      });
    },
    async searchByCnr() {
      unsupported("commercial_provider_not_configured");
    },
    async searchByCase() {
      unsupported("commercial_provider_not_configured");
    },
    async searchSupremeCourt() {
      unsupported("commercial_provider_not_configured");
    },
    async fetchCase() {
      unsupported("commercial_provider_not_configured");
    },
    async listOrders() {
      unsupported("commercial_provider_not_configured");
    },
  };
}

function createSupremeCourtProvider() {
  return {
    name: "supreme_court",
    async capabilities() {
      return baseCapabilities({
        provider: "supreme_court",
        supremeCourtSearch: false,
        notes: "Supreme Court is a separate Phase 5 adapter. Use official SCI portals until enabled.",
      });
    },
    async searchByCnr() {
      unsupported("supreme_court_cnr");
    },
    async searchByCase() {
      unsupported("supreme_court_search");
    },
    async searchSupremeCourt() {
      unsupported("supreme_court_search");
    },
    async fetchCase() {
      unsupported("supreme_court_search");
    },
    async listOrders() {
      unsupported("supreme_court_search");
    },
  };
}

function resolveCourtProvider(name) {
  const key = String(name || process.env.COURT_DATA_PROVIDER || "fixture").toLowerCase();
  if (key === "official_link" || key === "official") return createOfficialLinkProvider();
  if (key === "commercial") return createCommercialCourtProvider();
  if (key === "supreme_court" || key === "sci") return createSupremeCourtProvider();
  return createFixtureCourtProvider();
}

module.exports = {
  createFixtureCourtProvider,
  createOfficialLinkProvider,
  createCommercialCourtProvider,
  createSupremeCourtProvider,
  resolveCourtProvider,
  baseCapabilities,
};
