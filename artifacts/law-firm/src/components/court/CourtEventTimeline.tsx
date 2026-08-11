export function CourtEventTimeline({
  events,
}: {
  events: Array<{
    id: string;
    eventType?: string;
    eventDate?: string | null;
    purpose?: string | null;
    stage?: string | null;
    courtNumber?: string | null;
    judgeOrBench?: string | null;
    causeListItemNumber?: string | null;
  }>;
}) {
  if (!events.length) {
    return <p className="text-sm text-[#1A2332]/40">No hearing history yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-primary/30 pl-3">
          <p className="text-xs font-bold text-[#1A2332]">
            {event.eventDate ? String(event.eventDate).slice(0, 10) : "Date unknown"} · {event.stage || event.purpose || event.eventType || "Hearing"}
          </p>
          <p className="text-[11px] text-[#1A2332]/45 mt-0.5">
            {[event.judgeOrBench, event.courtNumber, event.causeListItemNumber ? `Item ${event.causeListItemNumber}` : null]
              .filter(Boolean)
              .join(" · ") || "Details not supplied by source"}
          </p>
        </li>
      ))}
    </ol>
  );
}
