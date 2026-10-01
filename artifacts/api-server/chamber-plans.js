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
        error: `${plan.name} includes ${plan.seniorSeats} Senior/Partner seats. The chamber owner already uses one. Add a senior seat or move to a larger plan.`,
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
  isSeniorMemberRole,
  assertMemberSeat,
};
