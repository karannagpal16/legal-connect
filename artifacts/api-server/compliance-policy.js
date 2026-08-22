/**
 * Legal Connect professional-conduct policy — single source of truth.
 *
 * The Advocates Act, 1961 and the Bar Council of India Rules (Chapter II, Part VI,
 * Rule 36 in particular) prohibit an advocate from advertising or soliciting work,
 * and prohibit sharing professional fees with a person who is not an advocate.
 * Legal Connect therefore charges for technology and administration only, and its
 * charge is never a function of an advocate's professional fee.
 *
 * Every runtime money-flow, transparency surface and content guard reads from this
 * module so that the shipped product and the written policy cannot drift apart.
 * Docs: docs/compliance/README.md
 */

/**
 * Flat platform service fee, charged per proxy mission irrespective of the
 * professional fee agreed for that mission. Fixed in rupees — not a percentage —
 * so that Legal Connect revenue does not scale with advocate compensation.
 */
const PLATFORM_SERVICE_FEE = {
  version: "flat_service_fee_v2",
  basis: "flat_per_mission",
  currency: "INR",
  /** Technology, supervision desk and administration charge per mission. */
  serviceFeeInr: 99,
  /** GST is charged on Legal Connect's own service fee, not on the professional fee. */
  gstPct: 18,
  description:
    "Legal Connect charges a flat technology and administration fee per mission, plus GST on that fee. "
    + "The charge does not vary with the advocate's professional fee and is not a share of it.",
};

const GST_ON_SERVICE_FEE_INR = Math.round(PLATFORM_SERVICE_FEE.serviceFeeInr * (PLATFORM_SERVICE_FEE.gstPct / 100));
const PLATFORM_CHARGE_TOTAL_INR = PLATFORM_SERVICE_FEE.serviceFeeInr + GST_ON_SERVICE_FEE_INR;

/**
 * Splits an amount collected from the posting advocate into the professional fee
 * payable in full to the appearing advocate and Legal Connect's flat charge.
 */
function computePlatformServiceCharge(collectedAmount) {
  const collected = Math.max(0, Math.round(Number(collectedAmount) || 0));
  const serviceFee = Math.min(PLATFORM_SERVICE_FEE.serviceFeeInr, collected);
  const gstOnServiceFee = Math.min(GST_ON_SERVICE_FEE_INR, Math.max(0, collected - serviceFee));
  return {
    currency: PLATFORM_SERVICE_FEE.currency,
    collected,
    serviceFee,
    gstOnServiceFee,
    professionalFee: Math.max(0, collected - serviceFee - gstOnServiceFee),
  };
}

/** Practices Legal Connect will not build, sell or enable. Mirrors Annexure B of the BCI representation. */
const PROHIBITED_PRACTICES = [
  "Paid or sponsored advocate rankings, placement or visibility.",
  "\u201cTop lawyer\u201d, \u201cbest advocate\u201d or comparable superlative claims about any advocate.",
  "Publishing success rates, win rates or outcome predictions for an advocate.",
  "Pay-per-lead, pay-per-enquiry or pay-per-matter arrangements with advocates.",
  "Commission, referral fee or any consideration for the allocation of professional work.",
  "Any share, percentage or slice of an advocate's professional fee.",
  "Auctioning, bidding or competitive quoting by advocates for a client's matter.",
  "Misleading specialisation, accreditation or seniority claims.",
  "Guaranteed matter allocation or guaranteed volumes of work to any advocate.",
  "Guaranteed or predicted case outcomes.",
  "Reserved professional legal services delivered by persons who are not advocates.",
  "Claiming approval, endorsement, accreditation or certification by the Bar Council of India or any State Bar Council.",
];

/** The ten non-negotiable governance rules the product is built against. */
const CONDUCT_RULES = [
  "Legal Connect takes no percentage of an advocate's professional fee.",
  "Legal Connect operates no pay-per-legal-matter model.",
  "Legal Connect sells no advocate ranking or placement.",
  "Legal Connect publishes no public \u201cbest lawyer\u201d rating of any advocate.",
  "Legal Connect guarantees no briefs or volume of work to any advocate.",
  "Advocates do not bid against each other for a matter on Legal Connect.",
  "Legal Connect makes no claim of Bar Council approval, authorisation or certification.",
  "No Legal Connect employee who is not an advocate provides legal advice.",
  "Institutional clients independently appoint and remove their own counsel.",
  "Legal Connect earns from technology, administration and enterprise services only.",
];

/**
 * Metrics Legal Connect may publish about a matter or an engagement measure
 * operational performance. They must never be presented as professional quality.
 */
const METRIC_POLICY = {
  permitted: [
    "Hearing update submitted within the agreed service window.",
    "Order sheet uploaded within the agreed service window.",
    "Acknowledgement of assignment within the agreed service window.",
    "Documents complete against the checklist the institution defined.",
  ],
  prohibited: [
    "Any star rating, score or grade presented as advocate quality.",
    "Any public league table, ranking or comparison of advocates.",
    "Any competence, seniority or outcome score attributed to an advocate.",
  ],
  statement:
    "Platform metrics measure operational performance against agreed service windows. "
    + "They are not an assessment of professional competence and are not published publicly.",
};

/** What a verification badge may and may not assert. */
const VERIFICATION_POLICY = {
  permittedLabels: [
    "Enrolment document checked",
    "Identity document checked",
    "Practice details self-declared by the advocate",
  ],
  prohibitedLabels: [
    "Verified lawyer",
    "BCI verified",
    "Bar Council certified",
    "Bar Council approved",
    "Best rated",
  ],
  statement:
    "Legal Connect states what document it checked and who checked it. Legal Connect does not "
    + "represent any check as approval, endorsement or accreditation by the Bar Council of India "
    + "or any State Bar Council.",
};

/** Serialisable policy for the transparency surface and enterprise due diligence. */
function publicCompliancePolicy() {
  return {
    framework: "Advocates Act, 1961; Bar Council of India Rules, Part VI, Chapter II (Rule 36 and allied rules)",
    positioning:
      "Legal Connect supplies technology and legal-operations infrastructure. Advocates are independent "
      + "legal professionals. Clients and institutions choose and engage advocates independently.",
    feeModel: {
      version: PLATFORM_SERVICE_FEE.version,
      basis: PLATFORM_SERVICE_FEE.basis,
      currency: PLATFORM_SERVICE_FEE.currency,
      serviceFeeInr: PLATFORM_SERVICE_FEE.serviceFeeInr,
      gstPct: PLATFORM_SERVICE_FEE.gstPct,
      gstOnServiceFeeInr: GST_ON_SERVICE_FEE_INR,
      totalPlatformChargeInr: PLATFORM_CHARGE_TOTAL_INR,
      percentageOfProfessionalFee: 0,
      description: PLATFORM_SERVICE_FEE.description,
    },
    conductRules: CONDUCT_RULES,
    prohibitedPractices: PROHIBITED_PRACTICES,
    metrics: METRIC_POLICY,
    verification: VERIFICATION_POLICY,
  };
}

module.exports = {
  PLATFORM_SERVICE_FEE,
  GST_ON_SERVICE_FEE_INR,
  PLATFORM_CHARGE_TOTAL_INR,
  PROHIBITED_PRACTICES,
  CONDUCT_RULES,
  METRIC_POLICY,
  VERIFICATION_POLICY,
  computePlatformServiceCharge,
  publicCompliancePolicy,
};
