/** Canonical ProxyHub Flow B stages shared by UI surfaces. */

export type ProxyFlowStageId =
  | "posted_escrow"
  | "lc_review"
  | "proxy_assigned"
  | "proxy_checked_in"
  | "proof_submitted"
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
    label: "Paid & posted",
    actor: "main_counsel",
    actorLabel: "Main counsel",
    detail: "CNR, court details and fee escrowed via Razorpay.",
  },
  {
    id: "lc_review",
    label: "LC review / assign",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "Admin reviews, raises query if needed, then assigns proxy.",
  },
  {
    id: "proxy_assigned",
    label: "Proxy assigned",
    actor: "proxy",
    actorLabel: "Proxy counsel",
    detail: "Assigned counsel declares no conflict, then appears.",
  },
  {
    id: "proxy_checked_in",
    label: "Checked in",
    actor: "proxy",
    actorLabel: "Proxy counsel",
    detail: "Day-of check-in opens the order-sheet proof window.",
  },
  {
    id: "proof_submitted",
    label: "Proof uploaded",
    actor: "proxy",
    actorLabel: "Proxy counsel",
    detail: "Order sheet / proof hash submitted. Escrow stays locked.",
  },
  {
    id: "counsel_ok",
    label: "Main counsel OK",
    actor: "main_counsel",
    actorLabel: "Main counsel",
    detail: "Poster confirms satisfaction (or rejects with reason).",
  },
  {
    id: "escrow_released",
    label: "Net released",
    actor: "lc",
    actorLabel: "Legal Connect",
    detail: "LC releases net after 10% platform + 3% tax (manual payout).",
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

  if (proof === "submitted" || status.includes("proof")) {
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
    return { actor: "system", label: "Complete", action: "Mission closed. Rate counterpart if you have not." };
  }
  if (stage === "counsel_ok") {
    return { actor: "lc", label: "Legal Connect", action: "Release net funds after 10% platform + 3% tax." };
  }
  if (stage === "proof_submitted") {
    return { actor: "main_counsel", label: "Main counsel", action: "Review proof — mark OK or Not OK with reason." };
  }
  if (stage === "proxy_checked_in" || proof === "rejected") {
    return { actor: "proxy", label: "Proxy counsel", action: proof === "rejected" ? "Re-upload a fresh order sheet." : "Upload order-sheet proof." };
  }
  if (stage === "proxy_assigned") {
    if (!task.conflictDeclaredAt) {
      return { actor: "proxy", label: "Proxy counsel", action: "Declare no conflict of interest." };
    }
    return { actor: "proxy", label: "Proxy counsel", action: "Day-of court check-in." };
  }
  if (status.includes("query")) {
    return { actor: "main_counsel", label: "Main counsel", action: "Respond to LC query so review can continue." };
  }
  if (stage === "lc_review" || stage === "posted_escrow") {
    return { actor: "lc", label: "Legal Connect", action: "Review posting and assign a verified proxy counsel." };
  }
  return { actor: "lc", label: "Legal Connect", action: "Continue mission supervision." };
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
