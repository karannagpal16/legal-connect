/** Canonical ProxyHub Flow B stages shared by UI surfaces. */

export type ProxyUrgencyTier = "urgent" | "priority" | "standard";

export type ProxyUrgencyMeta = {
  id: ProxyUrgencyTier;
  label: string;
  fee: number;
  postingHint: string;
  slaAfterAssign: string;
  slaShort: string;
};

/** Posted timing → escrow fee → SLA once LC verifies & assigns. */
export const PROXY_URGENCY_TIERS: Record<ProxyUrgencyTier, ProxyUrgencyMeta> = {
  urgent: {
    id: "urgent",
    label: "Urgent",
    fee: 1299,
    postingHint: "Need appearance soon (e.g. adjournment in ~15 minutes)",
    slaAfterAssign: "Finish within 1 hour after you are assigned",
    slaShort: "Due in 1 hour",
  },
  priority: {
    id: "priority",
    label: "Same day",
    fee: 799,
    postingHint: "Same business-day appearance",
    slaAfterAssign: "Finish the same business day after you are assigned",
    slaShort: "Due today",
  },
  standard: {
    id: "standard",
    label: "Standard",
    fee: 499,
    postingHint: "Next business day / normal court hours",
    slaAfterAssign: "Finish next business day during court hours",
    slaShort: "Due next court day",
  },
};

export const PROXY_MIN_FEE = PROXY_URGENCY_TIERS.standard.fee;

/**
 * Legal Connect charges a flat technology and administration fee per mission plus GST
 * on that fee. It is never a percentage of the professional fee, which is paid in full
 * to the appearing advocate. Server source of truth: artifacts/api-server/compliance-policy.js.
 */
export const PLATFORM_SERVICE_FEE_INR = 99;
export const PLATFORM_SERVICE_FEE_GST_INR = 18;
export const PLATFORM_CHARGE_TOTAL_INR = PLATFORM_SERVICE_FEE_INR + PLATFORM_SERVICE_FEE_GST_INR;

export type ProxySettlementBreakdown = {
  collected: number;
  platformFee: number;
  gstOnPlatformFee: number;
  professionalFee: number;
};

/** Mirrors the server settlement so the posting advocate sees the split before paying. */
export function proxySettlementBreakdown(collectedAmount: number): ProxySettlementBreakdown {
  const collected = Math.max(0, Math.round(Number(collectedAmount) || 0));
  const platformFee = Math.min(PLATFORM_SERVICE_FEE_INR, collected);
  const gstOnPlatformFee = Math.min(PLATFORM_SERVICE_FEE_GST_INR, Math.max(0, collected - platformFee));
  return {
    collected,
    platformFee,
    gstOnPlatformFee,
    professionalFee: Math.max(0, collected - platformFee - gstOnPlatformFee),
  };
}

export function resolveProxyUrgency(value?: string | null): ProxyUrgencyTier {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "urgent" || raw === "high" || raw === "asap") return "urgent";
  if (raw === "priority" || raw === "same_day" || raw === "same-day") return "priority";
  return "standard";
}

export function proxyUrgencyMeta(value?: string | null): ProxyUrgencyMeta {
  return PROXY_URGENCY_TIERS[resolveProxyUrgency(value)];
}

export type ProxyFlowStageId =
  | "posted_escrow"
  | "lc_review"
  | "proxy_assigned"
  | "proxy_accepted"
  | "proxy_checked_in"
  | "proof_submitted"
  | "lc_verified"
  | "counsel_ok"
  | "counsel_unsatisfied"
  | "escrow_released"
  | "refunded";

export type ProxyFlowActor = "main_counsel" | "lc" | "proxy" | "system";

export type ProxyFlowStage = {
  id: ProxyFlowStageId;
  label: string;
  actor: ProxyFlowActor;
  actorLabel: string;
  detail: string;
};

export const PROXY_FLOW_STAGES: ProxyFlowStage[] = [
  {
    id: "posted_escrow",
    label: "Paid",
    actor: "main_counsel",
    actorLabel: "You posted",
    detail: "Fee is LOCKED by Legal Connect against a booking ID. It is not yet ProxyHub revenue.",
  },
  {
    id: "lc_review",
    label: "Needs assign",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Interested advocates surface here — LC picks one.",
  },
  {
    id: "proxy_assigned",
    label: "Assigned",
    actor: "proxy",
    actorLabel: "Proxy",
    detail: "Proxy must accept the mission.",
  },
  {
    id: "proxy_accepted",
    label: "Accepted",
    actor: "proxy",
    actorLabel: "Proxy",
    detail: "Conflict declare, check in, then upload proof.",
  },
  {
    id: "proxy_checked_in",
    label: "In court",
    actor: "proxy",
    actorLabel: "Proxy",
    detail: "Checked in — upload the order sheet next.",
  },
  {
    id: "proof_submitted",
    label: "LC checks proof",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Admin verifies the order sheet, then sends it to the posting counsel.",
  },
  {
    id: "lc_verified",
    label: "Counsel review",
    actor: "main_counsel",
    actorLabel: "Poster",
    detail: "Main counsel: satisfied or not satisfied. No decision within 24–48 hours auto-approves the split.",
  },
  {
    id: "counsel_ok",
    label: "Satisfied",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Admin may release net funds or refund.",
  },
  {
    id: "counsel_unsatisfied",
    label: "Not satisfied",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Admin acknowledges reason and refunds.",
  },
  {
    id: "escrow_released",
    label: "Split settled",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "LC pays ProxyHub's merchant share and the proxy's professional fee in one split. Gross never parks in ProxyHub first.",
  },
  {
    id: "refunded",
    label: "Refunded",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Refund to the posting advocate's original payment method. Not routed via ProxyHub.",
  },
];

export type ProxyFlowTaskLike = {
  status?: string | null;
  proofStatus?: string | null;
  escrowStatus?: string | null;
  posterProofDecision?: string | null;
  conflictDeclaredAt?: string | null;
  checkedInAt?: string | null;
  acceptedBy?: string | number | null;
  proxyAcceptedAt?: string | null;
  refundRequested?: boolean | null;
  settlementReleasedAt?: string | null;
  liveTrack?: { headline?: string; nodes?: Array<{ id: string; label: string; state: string; detail?: string }> } | null;
  mainCounsel?: { name?: string; practiceLabel?: string; practiceCourts?: string } | null;
  proxyCounsel?: { name?: string; practiceLabel?: string; practiceCourts?: string } | null;
  assignedProxyName?: string | null;
  posterName?: string | null;
  court?: string | null;
  location?: string | null;
};

function norm(value?: string | null) {
  return String(value || "").toLowerCase().trim();
}

export function humanProxyStatus(task: ProxyFlowTaskLike): string {
  const stage = resolveProxyFlowStage(task);
  return PROXY_FLOW_STAGES.find((item) => item.id === stage)?.label || String(task.status || "Posted");
}

export function resolveProxyFlowStage(task: ProxyFlowTaskLike): ProxyFlowStageId {
  const status = norm(task.status);
  const proof = norm(task.proofStatus);
  const escrow = norm(task.escrowStatus);
  const decision = norm(task.posterProofDecision);

  if (escrow.includes("refund") || status.includes("refund")) {
    return "refunded";
  }

  if (
    escrow.includes("release")
    || status.includes("escrow_released")
    || status.includes("payment released")
    || status === "completed"
    || status.includes("closed")
    || task.settlementReleasedAt
  ) {
    return "escrow_released";
  }

  if (task.refundRequested || proof === "poster_unsatisfied" || (decision === "not_ok" && proof !== "rejected")) {
    return "counsel_unsatisfied";
  }

  if (proof === "poster_approved" || proof === "approved" || decision === "ok") {
    return "counsel_ok";
  }

  if (proof === "lc_verified") {
    return "lc_verified";
  }

  if (proof === "submitted" || (status.includes("proof") && !status.includes("approved") && !status.includes("verified"))) {
    return "proof_submitted";
  }

  if (task.checkedInAt || status.includes("checked")) {
    return "proxy_checked_in";
  }

  if (task.proxyAcceptedAt || task.conflictDeclaredAt || status.includes("proxy accepted")) {
    return "proxy_accepted";
  }

  if (
    task.acceptedBy
    || status.includes("assign")
    || status === "accepted"
    || status.includes("proxy_assigned")
  ) {
    return "proxy_assigned";
  }

  if (
    status.includes("pending_admin")
    || status.includes("awaiting admin")
    || status.includes("query")
    || status === "open"
  ) {
    return "lc_review";
  }

  return "posted_escrow";
}

/** Stages shown on the progress rail (terminal branches collapse). */
export function visibleProxyFlowStages(task: ProxyFlowTaskLike): ProxyFlowStage[] {
  const stage = resolveProxyFlowStage(task);
  return PROXY_FLOW_STAGES.filter((item) => {
    if (item.id === "counsel_unsatisfied") return stage === "counsel_unsatisfied" || stage === "refunded";
    if (item.id === "counsel_ok") return stage !== "counsel_unsatisfied" && stage !== "refunded";
    if (item.id === "refunded") return stage === "refunded" || stage === "counsel_unsatisfied";
    if (item.id === "escrow_released") return stage === "escrow_released" || stage === "counsel_ok";
    return true;
  });
}

export function proxyFlowIndex(task: ProxyFlowTaskLike): number {
  const stage = resolveProxyFlowStage(task);
  const stages = visibleProxyFlowStages(task);
  return Math.max(0, stages.findIndex((item) => item.id === stage));
}

export function nextProxyActor(task: ProxyFlowTaskLike): { actor: ProxyFlowActor; label: string; action: string } {
  const stage = resolveProxyFlowStage(task);
  const proof = norm(task.proofStatus);
  const status = norm(task.status);

  if (stage === "escrow_released" || stage === "refunded") {
    return { actor: "system", label: "Done", action: stage === "refunded" ? "Refund acknowledged." : "Mission finished." };
  }
  if (stage === "counsel_unsatisfied") {
    return { actor: "lc", label: "Legal Connect", action: "Acknowledge reason and refund main counsel." };
  }
  if (stage === "counsel_ok") {
    return { actor: "lc", label: "Legal Connect", action: "Release funds to proxy or refund." };
  }
  if (stage === "lc_verified") {
    return { actor: "main_counsel", label: "Main counsel", action: "Mark satisfied or not satisfied (with reason)." };
  }
  if (stage === "proof_submitted") {
    return { actor: "lc", label: "Legal Connect", action: "Verify the order sheet, then send it to the posting counsel." };
  }
  if (stage === "proxy_checked_in" || proof === "rejected") {
    return { actor: "proxy", label: "Proxy", action: proof === "rejected" ? "Upload a fresh order sheet." : "Upload the order sheet." };
  }
  if (stage === "proxy_accepted") {
    if (!task.conflictDeclaredAt) {
      return { actor: "proxy", label: "Proxy", action: "Confirm no conflict of interest." };
    }
    return { actor: "proxy", label: "Proxy", action: "Check in at court." };
  }
  if (stage === "proxy_assigned") {
    return { actor: "proxy", label: "Proxy", action: "Accept this mission." };
  }
  if (status.includes("query")) {
    return { actor: "main_counsel", label: "Poster", action: "Answer Legal Connect’s question." };
  }
  if (stage === "lc_review" || stage === "posted_escrow") {
    return { actor: "lc", label: "Legal Connect", action: "Assign from interested advocates (match practice court)." };
  }
  return { actor: "lc", label: "Legal Connect", action: "Continue supervision." };
}

/** Plain button label for the person who should act now. */
export function nextActionButtonLabel(task: ProxyFlowTaskLike): string {
  const stage = resolveProxyFlowStage(task);
  const proof = norm(task.proofStatus);
  if (stage === "counsel_unsatisfied") return "Acknowledge & refund";
  if (stage === "counsel_ok") return "Release or refund";
  if (stage === "lc_verified") return "Review proof";
  if (stage === "proof_submitted") return "Verify proof (LC)";
  if (stage === "proxy_checked_in" || proof === "rejected") {
    return proof === "rejected" ? "Re-upload order sheet" : "Upload order sheet";
  }
  if (stage === "proxy_accepted") {
    return task.conflictDeclaredAt ? "Check in at court" : "Confirm no conflict";
  }
  if (stage === "proxy_assigned") return "Accept mission";
  if (norm(task.status).includes("query")) return "Answer question";
  if (stage === "lc_review" || stage === "posted_escrow") return "Assign proxy";
  return "Open mission";
}

export function canEditProxyMissionDetails(task: ProxyFlowTaskLike): boolean {
  const status = norm(task.status);
  const stage = resolveProxyFlowStage(task);
  if (stage !== "posted_escrow" && stage !== "lc_review") return false;
  return (
    status.includes("pending_admin")
    || status.includes("awaiting admin")
    || status.includes("query")
    || status === "open"
    || !task.acceptedBy
  );
}

export function courtMatchScore(missionCourt: string | null | undefined, practiceCourts: string | null | undefined): number {
  const court = String(missionCourt || "").toLowerCase().trim();
  const practice = String(practiceCourts || "").toLowerCase().trim();
  if (!court || !practice) return 0;
  if (practice.includes(court)) return 2;
  const tokens = court.split(/\s+/).filter((t) => t.length > 3);
  return tokens.some((token) => practice.includes(token)) ? 1 : 0;
}
