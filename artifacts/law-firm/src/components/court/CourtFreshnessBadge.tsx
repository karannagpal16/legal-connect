const LABELS: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-500/10 border-emerald-500/25 text-emerald-600" },
  updated_today: { label: "Updated today", className: "bg-sky-500/10 border-sky-500/25 text-sky-600" },
  stale: { label: "Stale", className: "bg-amber-500/10 border-amber-500/25 text-amber-700" },
  sync_unavailable: { label: "Sync unavailable", className: "bg-[#1A2332]/5 border-[#1A2332]/15 text-[#1A2332]/55" },
};

export function CourtFreshnessBadge({
  freshness,
  lastSuccessAt,
}: {
  freshness?: string | null;
  lastSuccessAt?: string | null;
}) {
  const key = String(freshness || "sync_unavailable");
  const cfg = LABELS[key] || LABELS.sync_unavailable;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
      {lastSuccessAt ? (
        <span className="normal-case tracking-normal opacity-70 font-medium">
          · {new Date(lastSuccessAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ) : null}
    </span>
  );
}
