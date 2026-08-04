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
  | "proxy_checked_in"
  | "proof_submitted"
  | "lc_verified"
  | "counsel_ok"
  | "escrow_released";

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
    detail: "Fee held safely until the work is done.",
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
    detail: "Proxy sees full counsel notes, confirms no conflict, then goes to court.",
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
    detail: "Posting counsel confirms OK or asks for a fresh scan.",
  },
  {
    id: "counsel_ok",
    label: "Confirmed",
    actor: "main_counsel",
    actorLabel: "Poster",
    detail: "Ready for Legal Connect to release payment.",
  },
  {
    id: "escrow_released",
    label: "Paid out",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Net amount released after platform fee and tax.",
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
  settlementReleasedAt?: string | null;
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

export function proxyFlowIndex(task: ProxyFlowTaskLike): number {
  const stage = resolveProxyFlowStage(task);
  return Math.max(0, PROXY_FLOW_STAGES.findIndex((item) => item.id === stage));
}

export function nextProxyActor(task: ProxyFlowTaskLike): { actor: ProxyFlowActor; label: string; action: string } {
  const stage = resolveProxyFlowStage(task);
  const proof = norm(task.proofStatus);
  const status = norm(task.status);

  if (stage === "escrow_released") {
    return { actor: "system", label: "Done", action: "Mission finished." };
  }
  if (stage === "counsel_ok") {
    return { actor: "lc", label: "Legal Connect", action: "Release payment to proxy." };
  }
  if (stage === "lc_verified") {
    return { actor: "main_counsel", label: "Poster", action: "Check the order sheet — OK or not OK." };
  }
  if (stage === "proof_submitted") {
    return { actor: "lc", label: "Legal Connect", action: "Verify the order sheet, then send it to the posting counsel." };
  }
  if (stage === "proxy_checked_in" || proof === "rejected") {
    return { actor: "proxy", label: "Proxy", action: proof === "rejected" ? "Upload a fresh order sheet." : "Upload the order sheet." };
  }
  if (stage === "proxy_assigned") {
    if (!task.conflictDeclaredAt) {
      return { actor: "proxy", label: "Proxy", action: "Confirm no conflict of interest." };
    }
    return { actor: "proxy", label: "Proxy", action: "Check in at court." };
  }
  if (status.includes("query")) {
    return { actor: "main_counsel", label: "Poster", action: "Answer Legal Connect’s question." };
  }
  if (stage === "lc_review" || stage === "posted_escrow") {
    return { actor: "lc", label: "Legal Connect", action: "Assign from interested advocates." };
  }
  return { actor: "lc", label: "Legal Connect", action: "Continue supervision." };
}

/** Plain button label for the person who should act now. */
export function nextActionButtonLabel(task: ProxyFlowTaskLike): string {
  const stage = resolveProxyFlowStage(task);
  const proof = norm(task.proofStatus);
  if (stage === "counsel_ok") return "Release payment";
  if (stage === "lc_verified") return "Review proof";
  if (stage === "proof_submitted") return "Verify proof (LC)";
  if (stage === "proxy_checked_in" || proof === "rejected") {
    return proof === "rejected" ? "Re-upload order sheet" : "Upload order sheet";
  }
  if (stage === "proxy_assigned") {
    return task.conflictDeclaredAt ? "Check in at court" : "Confirm no conflict";
  }
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
