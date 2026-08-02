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

const EVENT_MAP: Record<string, Partial<ResolvedNotificationAction>> = {
  case_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/client", overlay: "chat", ctaLabel: "Open case desk" },
  booking_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/client", overlay: "chat", ctaLabel: "View assignment" },
  intake_assigned: { actionType: "LAWYER_ASSIGNED", targetUrl: "/advocate", overlay: "none", ctaLabel: "Open practice desk" },
  intake_info_requested: { actionType: "DOCUMENT_REQUIRED", targetUrl: "/client", overlay: "documents", ctaLabel: "Upload documents" },
  intake_guidance: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "Read update" },
  lc_supervisor_update: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "View case update" },
  case_update_approved: { actionType: "CASE_UPDATE", targetUrl: "/client/updates", overlay: "none", ctaLabel: "Open update" },
  payment_due: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client/book", overlay: "payment", ctaLabel: "Pay now" },
  payment_failed: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client/book", overlay: "payment", ctaLabel: "Retry payment" },
  payment_locked: { actionType: "PAYMENT_REQUIRED", targetUrl: "/client", overlay: "payment", ctaLabel: "View payment" },
  booking_confirmed: { actionType: "CASE_UPDATE", targetUrl: "/client", overlay: "none", ctaLabel: "Open workspace" },
  hearing_scheduled: { actionType: "HEARING_REMINDER", targetUrl: "/client", overlay: "hearing", ctaLabel: "View hearing" },
  clash_warning: { actionType: "HEARING_REMINDER", targetUrl: "/advocate/diary", overlay: "hearing", ctaLabel: "Open diary" },
  quest_assigned: { actionType: "QUEST_ACTION", targetUrl: "/intern/quests", overlay: "none", ctaLabel: "Start quest" },
  quest_completed: { actionType: "QUEST_ACTION", targetUrl: "/intern/quests", overlay: "none", ctaLabel: "View quests" },
  proxy_proof_needed: { actionType: "DOCUMENT_REQUIRED", targetUrl: "/advocate/proxy", overlay: "documents", ctaLabel: "Upload proof" },
  proxy_assigned: { actionType: "GENERIC_NAV", targetUrl: "/advocate/proxy", overlay: "none", ctaLabel: "Open Proxy Hub" },
  verification_pending: { actionType: "KYC_VERIFICATION", targetUrl: "/admin/verifications", overlay: "none", ctaLabel: "Review KYC" },
};

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

  let targetUrl = String(item.targetUrl || payload.targetUrl || mapped.targetUrl || "");
  if (!targetUrl) {
    if (role === "advocate") targetUrl = "/advocate";
    else if (role === "admin") targetUrl = "/admin/control";
    else if (role === "intern") targetUrl = "/intern/quests";
    else targetUrl = "/client";
  }

  // Role-safe redirects for shared event types
  if (role === "advocate" && ["/client", "/client/updates", "/client/book"].includes(targetUrl)) {
    targetUrl = eventType.includes("proxy") ? "/advocate/proxy" : "/advocate";
  }
  if (role === "admin" && targetUrl.startsWith("/client")) targetUrl = "/admin/control";
  if (role === "intern" && (targetUrl.startsWith("/client") || targetUrl.startsWith("/advocate"))) {
    targetUrl = "/intern/quests";
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

  if (actionPayload.caseId && targetUrl === "/client") {
    targetUrl = `/client?caseId=${encodeURIComponent(actionPayload.caseId)}${actionPayload.tab ? `&tab=${encodeURIComponent(actionPayload.tab)}` : ""}`;
  }

  const overlay = (mapped.overlay
    || (explicitType === "PAYMENT_REQUIRED" ? "payment"
      : explicitType === "DOCUMENT_REQUIRED" ? "documents"
        : explicitType === "LAWYER_ASSIGNED" || explicitType === "CHAT_MESSAGE" ? "chat"
          : explicitType === "HEARING_REMINDER" ? "hearing"
            : "none")) as ResolvedNotificationAction["overlay"];

  return {
    actionType: explicitType,
    targetUrl,
    overlay: role === "client" ? overlay : overlay === "payment" || overlay === "chat" ? overlay : "none",
    actionPayload,
    ctaLabel: mapped.ctaLabel || "Open",
  };
}
