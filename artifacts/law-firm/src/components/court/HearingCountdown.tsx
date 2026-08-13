export function HearingCountdown({ nextHearingDate }: { nextHearingDate?: string | null }) {
  if (!nextHearingDate) {
    return <p className="text-xs text-[#1A2332]/40">No next hearing date on record.</p>;
  }
  const target = Date.parse(String(nextHearingDate).slice(0, 10));
  if (!Number.isFinite(target)) {
    return <p className="text-xs text-[#1A2332]/40">Hearing date unavailable.</p>;
  }
  const days = Math.ceil((target - Date.now()) / (24 * 3600 * 1000));
  let label = `${days} day${days === 1 ? "" : "s"} away`;
  if (days < 0) label = `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) label = "Today";
  if (days === 1) label = "Tomorrow";
  return (
    <p className="text-sm font-semibold text-[#1A2332]">
      Next hearing {String(nextHearingDate).slice(0, 10)} · <span className="text-primary">{label}</span>
    </p>
  );
}
