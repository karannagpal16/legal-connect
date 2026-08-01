import { Clock3, Radio } from "lucide-react";
import { usePlatformEventTimeline, type PlatformEvent } from "@/hooks/usePlatformEvents";

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

type Props = {
  caseId?: string | null;
  taskId?: string | null;
  bookingId?: string | null;
  title?: string;
  emptyText?: string;
  limit?: number;
  compact?: boolean;
};

export function ActivityAuditTimeline({
  caseId,
  taskId,
  bookingId,
  title = "Minute-by-Minute Activity Audit",
  emptyText = "Live activity will appear here as intakes, assignments, stages and proxy missions update.",
  limit = 24,
  compact = false,
}: Props) {
  const feed = usePlatformEventTimeline({ caseId, taskId, bookingId, limit });
  const events = feed.data?.events || [];

  return (
    <section className={`lc-activity-timeline ${compact ? "compact" : ""}`} aria-live="polite">
      <header>
        <div>
          <span className="lc-kicker"><Radio /> Live sync</span>
          <h3>{title}</h3>
        </div>
        <small>{feed.isFetching ? "Refreshing…" : "Synced across portals"}</small>
      </header>

      {feed.isLoading ? (
        <p className="lc-inline-empty">Loading activity feed…</p>
      ) : events.length === 0 ? (
        <p className="lc-inline-empty">{emptyText}</p>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.eventId}>
              <span className="lc-timeline-dot" aria-hidden />
              <div>
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
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
