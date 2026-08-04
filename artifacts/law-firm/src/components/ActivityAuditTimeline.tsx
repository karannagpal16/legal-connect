import { Clock3, Radio } from "lucide-react";
import { useLocation } from "wouter";
import { usePlatformEventTimeline, type PlatformEvent } from "@/hooks/usePlatformEvents";
import { appPath } from "@/lib/appPath";
import { useAuth } from "@/lib/auth";

const EVENT_COPY: Record<string, string> = {
  INTAKE_SUBMITTED_AND_PAID: "Booking Submitted & Fee Paid",
  LAWYER_ASSIGNED_BY_LC: "Lawyer Assigned by Legal Connect",
  ADVOCATE_ACKNOWLEDGED: "Advocate Connected",
  STAGE_ADVANCED_BY_ADVOCATE: "Court Stage Advanced",
  PROXY_MISSION_POSTED: "Proxy Mission Posted",
  PROXY_MISSION_ACCEPTED: "Proxy Mission Accepted",
  PROXY_PROOF_UPLOADED: "Proxy Proof Uploaded",
  CHAMBER_TASK_DELEGATED: "Chamber Task Delegated",
  COURT_FEE_PAID: "Court Fee Paid",
  REQUEST_ENTERTAINED: "Request Entertained",
  STATUS_UPDATE: "Status Update",
};

function formatStamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(date);
}

function eventHeading(event: PlatformEvent) {
  return event.title || EVENT_COPY[event.eventType] || event.eventType.replace(/_/g, " ");
}

function destinationForEvent(event: PlatformEvent, role?: string) {
  const bookingId = event.targets?.bookingId || String(event.payload?.bookingId || event.payload?.intakeId || "");
  const taskId = event.targets?.taskId || String(event.payload?.taskId || "");
  const caseId = event.targets?.caseId || String(event.payload?.caseId || "");
  const type = String(event.eventType || "").toLowerCase();

  if (role === "admin") {
    if (type.includes("retention") || type.includes("gateway")) {
      return `/admin/control?tab=gateway${bookingId ? `&bookingId=${encodeURIComponent(bookingId)}` : ""}`;
    }
    if (type.includes("proxy") || type.includes("mission") || taskId) {
      return `/admin/control?tab=proxy${taskId ? `&taskId=${encodeURIComponent(taskId)}` : ""}`;
    }
    if (type.includes("verif")) return "/admin/verifications";
    if (type.includes("pending") || type.includes("update")) {
      return `/admin/control?tab=moderation${caseId ? `&caseId=${encodeURIComponent(caseId)}` : ""}`;
    }
    if (bookingId) return `/admin/control?tab=intakes&bookingId=${encodeURIComponent(bookingId)}`;
    if (caseId) return `/admin/control?tab=cases&caseId=${encodeURIComponent(caseId)}`;
    return "/admin/control";
  }
  if (role === "advocate") {
    if (type.includes("proxy") || taskId) return taskId ? `/advocate/proxy?taskId=${encodeURIComponent(taskId)}` : "/advocate/proxy";
    return caseId ? `/advocate?caseId=${encodeURIComponent(caseId)}` : "/advocate";
  }
  if (role === "intern") return "/intern/quests";
  if (caseId) return `/client?caseId=${encodeURIComponent(caseId)}&tab=overview&action=highlight`;
  if (bookingId) return `/client?bookingId=${encodeURIComponent(bookingId)}`;
  return "/client";
}

type Props = {
  caseId?: string | null;
  taskId?: string | null;
  bookingId?: string | null;
  title?: string;
  emptyText?: string;
  limit?: number;
  compact?: boolean;
  panel?: boolean;
};

export function ActivityAuditTimeline({
  caseId,
  taskId,
  bookingId,
  title = "Minute-by-Minute Activity Audit",
  emptyText = "Live activity will appear here as intakes, assignments, stages and proxy missions update.",
  limit = 24,
  compact = false,
  panel = false,
}: Props) {
  const feed = usePlatformEventTimeline({ caseId, taskId, bookingId, limit });
  const events = feed.data?.events || [];
  const [, setLocation] = useLocation();
  const { session } = useAuth();
  const role = String(session?.user.role || "").toLowerCase();
  const isPanel = panel || compact;

  return (
    <section
      className={`lc-activity-timeline ${compact ? "compact" : ""} ${panel ? "panel-box" : ""}`}
      aria-live="polite"
    >
      <header>
        <div>
          <span className="lc-kicker"><Radio /> Live sync</span>
          <h3>{isPanel ? "Live Sync" : title}</h3>
        </div>
        <small>{feed.isFetching ? "Refreshing…" : "Live"}</small>
      </header>

      {feed.isLoading ? (
        <p className="lc-inline-empty">Loading…</p>
      ) : events.length === 0 ? (
        <p className="lc-inline-empty">{emptyText}</p>
      ) : (
        <ol>
          {events.map((event) => {
            const href = destinationForEvent(event, role);
            return (
              <li key={event.eventId}>
                <span className="lc-timeline-dot" aria-hidden />
                <button
                  type="button"
                  className="lc-timeline-link"
                  onClick={() => setLocation(appPath(href))}
                  title="Open related workspace"
                >
                  <strong>
                    <Clock3 /> {formatStamp(event.timestamp)} · {eventHeading(event)}
                  </strong>
                  <p>{event.message || "Platform status updated."}</p>
                  <small>
                    {[
                      event.actor?.name ? `By ${event.actor.name}` : null,
                      event.actor?.role ? `(${event.actor.role})` : null,
                      typeof event.payload?.latencyMs === "number" ? `· ${event.payload.latencyMs}ms` : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
