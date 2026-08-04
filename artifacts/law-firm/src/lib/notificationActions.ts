export type NotificationActionType =
  | "PAYMENT_REQUIRED"
  | "LAWYER_ASSIGNED"
  | "DOCUMENT_REQUIRED"
  | "CASE_UPDATE"
  | "HEARING_REMINDER"
  | "CHAT_MESSAGE"
  | "KYC_VERIFICATION"
  | "ADMIN_ASSIGN"
  | "QUEST_ACTION"
  | "GENERIC_NAV";

export type NotificationActionPayload = {
  caseId?: string;
  bookingId?: string;
  amount?: number;
  lawyerId?: string;
  lawyerName?: string;
  docType?: string;
  meetingId?: string;
  taskId?: string;
  questId?: string;
  tab?: string;
};

export type ActionableNotification = {
  id: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt?: string | null;
  priority?: string;
  eventType?: string | null;
  actionType?: NotificationActionType | string | null;
  targetUrl?: string | null;
  actionPayload?: NotificationActionPayload | null;
  payload?: Record<string, unknown> | null;
};

export type ResolvedNotificationAction = {
  actionType: NotificationActionType;
  targetUrl: string;
  overlay: "payment" | "documents" | "chat" | "hearing" | "none";
  actionPayload: NotificationActionPayload;
  ctaLabel: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function str(value: unknown) {
  return value == null ? undefined : String(value);
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function withQuery(base: string, params: Record<string, string | undefined>) {
  const path = base.split("?")[0] || base;
  const search = new URLSearchParams(base.includes("?") ? base.split("?")[1] : "");
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

const EVENT_MAP: Record<string, Partial<ResolvedNotificationAction>> = {
  case_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/client", overlay: "chat", ctaLabel: "Open case desk" },
  case_added: { actionType: "CASE_UPDATE", targetUrl: "/client", overlay: "none", ctaLabel: "Open matter" },
  booking_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/client", overlay: "chat", ctaLabel: "View assignment" },
  intake_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/advocate", overlay: "none", ctaLabel: "Open practice desk" },
  intake_info_requested: { actionType: "DOCUMENT_REQUIRED", targetUrl: "/client", overlay: "documents", ctaLabel: "Upload documents" },
  intake_guidance: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "Read update" },
  lc_supervisor_update: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "View case update" },
  case_update_approved: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "Open update" },
  payment_due: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client/book", overlay: "payment", ctaLabel: "Pay now" },
  payment_failed: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client/book", overlay: "payment", ctaLabel: "Retry payment" },
  payment_locked: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client", overlay: "payment", ctaLabel: "View payment" },
  payment_verified: { actionType: "CASE_UPDATE", targetUrl: "/client", overlay: "none", ctaLabel: "Open workspace" },
  booking_confirmed: { actionType: "CASE_UPDATE", targetUrl: "/client", overlay: "none", ctaLabel: "Open workspace" },
  hearing_scheduled: { actionType: "HEARING_REMINDER", targetUrl: "/client", overlay: "hearing", ctaLabel: "View hearing" },
  clash_warning: { actionType: "HEARING_REMINDER", targetUrl: "/advocate/diary", overlay: "hearing", ctaLabel: "Open diary" },
  quest_assigned: { actionType: "QUEST_ACTION", targetUrl: "/intern/quests", overlay: "none", ctaLabel: "Start quest" },
  quest_completed: { actionType: "QUEST_ACTION", targetUrl: "/intern/quests", overlay: "none", ctaLabel: "View quests" },
  proxy_proof_needed: { actionType: "DOCUMENT_REQUIRED", targetUrl: "/advocate/proxy", overlay: "documents", ctaLabel: "Upload proof" },
  proxy_interest: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/missions", overlay: "none", ctaLabel: "Review interest" },
  proxy_proof_lc_verified: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Review proof" },
  proxy_proof_submitted: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/missions", overlay: "none", ctaLabel: "Verify proof" },
  proxy_proof_approved: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  proxy_escrow_released: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  proxy_assigned: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  proxy_mission_assigned: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  proxy_mission_posted: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/missions", overlay: "none", ctaLabel: "Open Missions" },
  task_draft_submitted: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  verification_pending: { actionType: "KYC_VERIFICATION", targetUrl: "/admin/verifications", overlay: "none", ctaLabel: "Review KYC" },
  identity_approved: { actionType: "CASE_UPDATE", targetUrl: "/client", overlay: "none", ctaLabel: "Open workspace" },
  identity_rejected: { actionType: "KYC_VERIFICATION", targetUrl: "/client", overlay: "none", ctaLabel: "Fix verification" },
  advisory_booked: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=intakes", overlay: "none", ctaLabel: "Open intake" },
  retention_requested: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=gateway", overlay: "none", ctaLabel: "Open LC Gateway" },
  retention_terms_quoted: { actionType: "CASE_UPDATE", targetUrl: "/client/engagement", overlay: "none", ctaLabel: "View terms" },
  retention_panel_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/client", overlay: "chat", ctaLabel: "Open matter" },
  retention_info_requested: { actionType: "DOCUMENT_REQUIRED", targetUrl: "/client", overlay: "documents", ctaLabel: "Upload documents" },
  case_update_pending: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=moderation", overlay: "none", ctaLabel: "Review counsel update" },
  case_update_pending_review: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=moderation", overlay: "none", ctaLabel: "Review counsel update" },
  case_update_held_for_lc: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=moderation", overlay: "none", ctaLabel: "Open LC review" },
  pending_update: { actionType: "ADMIN_ASSIGN", targetUrl: "/admin/control?tab=moderation", overlay: "none", ctaLabel: "Open LC review" },
};

function adminDeepLink(
  eventType: string,
  actionType: string,
  payload: NotificationActionPayload,
  currentUrl: string,
) {
  const bookingId = payload.bookingId;
  const taskId = payload.taskId;
  const caseId = payload.caseId;
  const pathOnly = currentUrl.split("?")[0] || currentUrl;

  if (eventType.includes("retention") || eventType.includes("gateway")) {
    return withQuery("/admin/control", { tab: "gateway", bookingId, intakeId: bookingId });
  }
  if (eventType.includes("verif") || actionType === "KYC_VERIFICATION") {
    return "/admin/verifications";
  }
  if (eventType.includes("pending") || eventType.includes("moderat") || eventType.includes("counsel_update")) {
    return withQuery("/admin/control", { tab: "moderation", caseId });
  }
  if (eventType.includes("escrow") || eventType.includes("payment") || eventType.includes("work_hold")) {
    return withQuery("/admin/control", { tab: "escrow", bookingId, taskId });
  }
  if (
    eventType.includes("proxy")
    || eventType.includes("mission")
    || eventType.includes("passover")
    || pathOnly.includes("/missions")
    || pathOnly.includes("/proxy")
  ) {
    return withQuery("/admin/missions", { taskId });
  }
  if (eventType.includes("advisory") || eventType.includes("intake") || eventType.includes("booking") || bookingId) {
    return withQuery("/admin/control", { tab: "intakes", bookingId, intakeId: bookingId });
  }
  if (caseId) {
    return withQuery("/admin/control", { tab: "cases", caseId });
  }
  if (taskId) {
    return withQuery("/admin/missions", { taskId });
  }
  if (currentUrl.startsWith("/admin")) return currentUrl;
  return "/admin/control";
}

function stripToPath(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "";
    }
  } catch {
    // ignore
  }
  if (value.startsWith("~")) return value.slice(1) || "/";
  return value;
}

export function resolveNotificationAction(
  item: ActionableNotification,
  role?: string,
): ResolvedNotificationAction {
  const payload = {
    ...asRecord(item.payload),
    ...asRecord(item.actionPayload),
  };
  const eventType = String(item.eventType || payload.eventType || "").toLowerCase();
  const mapped = EVENT_MAP[eventType] || {};
  const explicitType = String(item.actionType || payload.actionType || mapped.actionType || "GENERIC_NAV") as NotificationActionType;

  let targetUrl = stripToPath(String(item.targetUrl || payload.targetUrl || mapped.targetUrl || ""));
  if (!targetUrl) {
    if (role === "advocate") targetUrl = "/advocate";
    else if (role === "admin") targetUrl = "/admin/control";
    else if (role === "intern") targetUrl = "/intern/quests";
    else targetUrl = "/client";
  }

  const actionPayload: NotificationActionPayload = {
    caseId: str(payload.caseId || payload.matterId),
    bookingId: str(payload.bookingId || payload.intakeId),
    amount: num(payload.amount),
    lawyerId: str(payload.lawyerId || payload.advocateId || payload.assignedAdvocateId),
    lawyerName: str(payload.lawyerName || payload.advocateName || payload.assignedAdvocateName),
    docType: str(payload.docType || payload.documentType),
    meetingId: str(payload.meetingId),
    taskId: str(payload.taskId),
    questId: str(payload.questId),
    tab: str(payload.tab),
  };

  // Role-safe redirects for shared event types
  if (role === "advocate" && ["/client", "/client/updates", "/client/book", "/client/engagement"].includes(targetUrl.split("?")[0])) {
    targetUrl = eventType.includes("proxy")
      ? withQuery("/advocate/proxy", { taskId: actionPayload.taskId })
      : withQuery("/advocate", { caseId: actionPayload.caseId, bookingId: actionPayload.bookingId });
  }
  if (role === "admin") {
    targetUrl = adminDeepLink(eventType, explicitType, actionPayload, targetUrl);
  }
  if (role === "intern" && (targetUrl.startsWith("/client") || targetUrl.startsWith("/advocate") || targetUrl.startsWith("/admin"))) {
    targetUrl = withQuery("/intern/quests", { questId: actionPayload.questId });
  }

  let overlay = (mapped.overlay
    || (explicitType === "PAYMENT_REQUIRED" ? "payment"
      : explicitType === "DOCUMENT_REQUIRED" ? "documents"
        : explicitType === "LAWYER_ASSIGNED" || explicitType === "CHAT_MESSAGE" ? "chat"
          : explicitType === "HEARING_REMINDER" ? "hearing"
            : "none")) as ResolvedNotificationAction["overlay"];

  // Build deep-link query so ClientHome can open the exact tab/modal.
  if (role === "client" || !role) {
    if (explicitType === "PAYMENT_REQUIRED") {
      targetUrl = withQuery("/client", {
        caseId: actionPayload.caseId,
        tab: "payments",
        action: "pay",
        amount: actionPayload.amount != null ? String(actionPayload.amount) : undefined,
      });
      actionPayload.tab = "payments";
    } else if (explicitType === "DOCUMENT_REQUIRED") {
      targetUrl = withQuery("/client", {
        caseId: actionPayload.caseId,
        tab: "documents",
        action: "upload",
        docType: actionPayload.docType,
      });
      actionPayload.tab = "documents";
    } else if (explicitType === "LAWYER_ASSIGNED" || explicitType === "CHAT_MESSAGE") {
      targetUrl = withQuery("/client", {
        caseId: actionPayload.caseId,
        tab: "communications",
        action: "chat",
      });
      actionPayload.tab = "communications";
    } else if (explicitType === "CASE_UPDATE") {
      if (targetUrl.startsWith("/client/updates") || targetUrl.startsWith("/client/engagement")) {
        // keep dedicated destination pages
      } else {
        targetUrl = withQuery("/client", {
          caseId: actionPayload.caseId,
          tab: "overview",
          action: "highlight",
        });
        actionPayload.tab = "overview";
      }
    } else if (explicitType === "HEARING_REMINDER") {
      targetUrl = withQuery("/client", {
        caseId: actionPayload.caseId,
        tab: "overview",
        action: "hearing",
      });
      actionPayload.tab = "overview";
    } else if (actionPayload.caseId && targetUrl.startsWith("/client")) {
      targetUrl = withQuery(targetUrl, {
        caseId: actionPayload.caseId,
        tab: actionPayload.tab,
      });
    }
  }

  // Admin / intern: always jump straight to the linked page (no confirmation overlay).
  if (role === "admin" || role === "intern") {
    overlay = "none";
  } else if (role === "advocate") {
    // Advocates go directly unless it is a true payment/document modal action on their own desk.
    if (!(overlay === "payment" || overlay === "documents")) overlay = "none";
  }

  const ctaByType: Partial<Record<NotificationActionType, string>> = {
    PAYMENT_REQUIRED: "Pay now",
    DOCUMENT_REQUIRED: "Upload documents",
    LAWYER_ASSIGNED: "Open assignment",
    CASE_UPDATE: "Open update",
    HEARING_REMINDER: "View hearing",
    CHAT_MESSAGE: "Open messages",
    KYC_VERIFICATION: "Review KYC",
    ADMIN_ASSIGN: "Open Ops Command",
    QUEST_ACTION: "Open quest",
    GENERIC_NAV: "Open linked page",
  };

  return {
    actionType: explicitType,
    targetUrl: stripToPath(targetUrl) || targetUrl,
    overlay: role === "client" || !role
      ? overlay
      : overlay,
    actionPayload,
    ctaLabel: mapped.ctaLabel || ctaByType[explicitType] || "Open linked page",
  };
}
