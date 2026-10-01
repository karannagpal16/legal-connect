/**
 * Chamber Vault commercial plans.
 * Stored plan ids stay stable. Older rows (`growth`, `chambers_plus`) resolve to Pro and Elite.
 * The chamber owner occupies one Senior/Partner seat. Invites are split by role.
 */

const PLAN_ALIASES = {
  growth: "pro",
  chambers_plus: "elite",
  "chambers+": "elite",
};

const SENIOR_MEMBER_ROLES = new Set(["senior", "partner", "owner", "co_senior"]);

const ADDON_RATES = {
  seniorSeatMonthly: 399,
  teamSeatMonthly: 149,
};

const CHAMBER_PLANS = {
  core: {
    id: "core",
    name: "Chamber Core",
    amount: 999,
    annualAmount: 9999,
    periodDays: 30,
    seniorSeats: 2,
    teamSeats: 6,
    seats: 8,
    maxOpenTasks: null,
    storageGb: 10,
    popular: false,
    tagline: "Small litigation chambers",
    profitNote: "The court-day loop is included. Unlimited matters and tasks.",
    seatLine: "2 Senior/Partner seats + 6 Team Members",
    auditLevel: "Activity log",
    perks: [
      "Unlimited matters",
      "Court Day Board",
      "Chamber assignments",
      "Hearing Closure & NDOH",
      "Case Diary",
      "Chamber Tasks",
      "Document Vault",
      "Notifications",
      "Basic activity history",
      "10 GB document storage",
    ],
  },
  pro: {
    id: "pro",
    name: "Chamber Pro",
    amount: 2499,
    annualAmount: 24999,
    periodDays: 30,
    seniorSeats: 4,
    teamSeats: 20,
    seats: 24,
    maxOpenTasks: null,
    storageGb: 50,
    popular: true,
    tagline: "Most popular",
    profitNote: "Draft, review, filing, and clash detection for a growing chamber.",
    seatLine: "4 Senior/Partner seats + 20 Team Members",
    auditLevel: "Matter audit",
    perks: [
      "Everything in Core",
      "Draft & Review Room",
      "Version-controlled drafts",
      "Senior approvals",
      "Filing workflow",
      "Court clash detection",
      "Matter Timeline",
      "Advanced Chamber Command",
      "Proxy Hub workflow",
      "Chamber analytics",
      "Matter-level audit history",
      "50 GB document storage",
    ],
  },
  elite: {
    id: "elite",
    name: "Chamber Elite",
    amount: 4999,
    annualAmount: 49999,
    periodDays: 30,
    seniorSeats: 8,
    teamSeats: 50,
    seats: 58,
    maxOpenTasks: null,
    storageGb: 200,
    popular: false,
    tagline: "Large chambers and firms",
    profitNote: "Control, storage, and onboarding for multi-team litigation practices.",
    seatLine: "8 Senior/Partner seats + 50 Team Members",
    auditLevel: "Full export",
    perks: [
      "Everything in Pro",
      "Advanced permissions",
      "Multi-team chamber management",
      "Full audit exports",
      "Large document storage",
      "Priority support",
      "Guided onboarding",
      "Advanced analytics",
      "Future premium AI allocation",
      "200 GB document storage",
    ],
  },
};

function chamberPlanCatalog() {
  return Object.values(CHAMBER_PLANS).map((plan) => ({
    ...plan,
    addons: ADDON_RATES,
  }));
}

function getChamberPlan(planId) {
  const raw = String(planId || "core").toLowerCase().replace(/\s+/g, "_");
  const key = PLAN_ALIASES[raw] || raw;
  return CHAMBER_PLANS[key] || CHAMBER_PLANS.core;
}

function isTopTierPlan(planId) {
  return getChamberPlan(planId).id === "elite";
}

function canonicalPlanId(planId) {
  const raw = String(planId || "").toLowerCase().replace(/\s+/g, "_");
  const key = PLAN_ALIASES[raw] || raw;
  return CHAMBER_PLANS[key] ? key : null;
}

function quoteChamberPlan(planOrId, billingCycle) {
  const plan = typeof planOrId === "string" ? getChamberPlan(planOrId) : planOrId;
  const annual = String(billingCycle || "monthly").toLowerCase() === "annual";
  return {
    ...plan,
    addons: ADDON_RATES,
    billingCycle: annual ? "annual" : "monthly",
    chargeAmount: annual ? plan.annualAmount : plan.amount,
    periodDays: annual ? 365 : plan.periodDays,
  };
}

/**
 * Entitlement comes from the Razorpay order (notes, receipt, amount), never from the verify body.
 * Receipts look like `ch_pro_yr_<ts>`. Demo orders look like `order_chamber_demo_pro_annual_<ts>`.
 */
function quoteFromPaidOrder(record) {
  const notes = record && typeof record.notes === "object" && record.notes ? record.notes : {};
  const receipt = String(record?.receipt || "");
  const orderId = String(record?.id || record?.orderId || "");
  const receiptMatch = receipt.match(/^ch_(core|pro|elite)_(yr|mo)_/);
  const demoMatch = orderId.match(/order_chamber_demo_(core|pro|elite)_(annual|monthly)_/);
  const notePlan = canonicalPlanId(notes.planId || notes.plan_id);
  const receiptPlan = receiptMatch ? receiptMatch[1] : null;
  const demoPlan = demoMatch ? demoMatch[1] : null;
  const noteCycleRaw = String(notes.billingCycle || notes.billing_cycle || "").toLowerCase();
  const noteCycle = noteCycleRaw === "annual" || noteCycleRaw === "monthly" ? noteCycleRaw : null;
  const receiptCycle = receiptMatch ? (receiptMatch[2] === "yr" ? "annual" : "monthly") : null;
  const demoCycle = demoMatch ? demoMatch[2] : null;
  if (notePlan && receiptPlan && notePlan !== receiptPlan) {
    return { ok: false, error: "The paid order plan does not match its receipt." };
  }
  if (noteCycle && receiptCycle && noteCycle !== receiptCycle) {
    return { ok: false, error: "The paid order term does not match its receipt." };
  }
  const planId = notePlan || receiptPlan || demoPlan;
  const billingCycle = noteCycle || receiptCycle || demoCycle;
  if (!planId || !billingCycle) {
    return { ok: false, error: "The paid order does not name a chamber plan." };
  }
  const quoted = quoteChamberPlan(planId, billingCycle);
  const amountPaise = Number(record?.amount);
  if (Number.isFinite(amountPaise) && amountPaise > 0 && amountPaise !== quoted.chargeAmount * 100) {
    return { ok: false, error: "The paid amount does not match this chamber plan." };
  }
  return { ok: true, quoted };
}

function isSeniorMemberRole(role) {
  return SENIOR_MEMBER_ROLES.has(String(role || "").toLowerCase());
}

/**
 * Owner already uses one senior seat. `members` are invited rows only.
 */
function assertMemberSeat(plan, members, nextRole) {
  const rows = Array.isArray(members) ? members : [];
  const seniorInvites = rows.filter((row) => isSeniorMemberRole(row.member_role || row.memberRole)).length;
  const teamInvites = rows.length - seniorInvites;
  const seniorUsed = 1 + seniorInvites;
  if (isSeniorMemberRole(nextRole)) {
    if (seniorUsed >= plan.seniorSeats) {
      return {
        ok: false,
        error: `${plan.name} includes ${plan.seniorSeats} Senior/Partner seats. The chamber owner already uses one. Additional Senior/Partner seats are ₹${ADDON_RATES.seniorSeatMonthly}/month, or upgrade the plan.`,
      };
    }
    return { ok: true, seniorUsed, teamUsed: teamInvites };
  }
  if (teamInvites >= plan.teamSeats) {
    return {
      ok: false,
      error: `${plan.name} includes ${plan.teamSeats} team seats. Additional team members are ₹${ADDON_RATES.teamSeatMonthly}/month, or upgrade the plan.`,
    };
  }
  return { ok: true, seniorUsed, teamUsed: teamInvites };
}

module.exports = {
  ADDON_RATES,
  CHAMBER_PLANS,
  PLAN_ALIASES,
  chamberPlanCatalog,
  getChamberPlan,
  isTopTierPlan,
  quoteChamberPlan,
  quoteFromPaidOrder,
  canonicalPlanId,
  isSeniorMemberRole,
  assertMemberSeat,
};
