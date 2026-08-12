export function VirtualCourtroomWidget({
  virtualCourtroom,
}: {
  virtualCourtroom?: {
    liveOnCauseList?: boolean;
    courtRoom?: string | null;
    currentItemNumber?: string | null;
    yourItemNumber?: string | null;
    estimatedMinutes?: number | null;
    headline?: string;
    badge?: string;
  } | null;
}) {
  const live = Boolean(virtualCourtroom?.liveOnCauseList);
  return (
    <section
      className={`rounded-2xl border p-4 ${
        live
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/40 to-card/20"
          : "border-[#1A2332]/10 bg-card/40"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-[#1A2332]">Virtual Courtroom</h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            live
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
              : "border-[#1A2332]/15 bg-[#1A2332]/5 text-[#1A2332]/50"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-[#1A2332]/35"}`} />
          {virtualCourtroom?.badge || (live ? "LIVE ON CAUSE LIST" : "NOT ON TODAY'S BOARD")}
        </span>
      </div>
      <p className="text-sm font-semibold text-[#1A2332] leading-snug">
        {virtualCourtroom?.headline || "Cause-list position not published for this sync"}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#1A2332]/5 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Room</p>
          <p className="text-xs font-bold text-[#1A2332] mt-0.5">{virtualCourtroom?.courtRoom || "—"}</p>
        </div>
        <div className="rounded-lg bg-[#1A2332]/5 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Now calling</p>
          <p className="text-xs font-bold text-[#1A2332] mt-0.5">
            {virtualCourtroom?.currentItemNumber ? `#${virtualCourtroom.currentItemNumber}` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-[#1A2332]/5 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Your item</p>
          <p className="text-xs font-bold text-[#1A2332] mt-0.5">
            {virtualCourtroom?.yourItemNumber ? `#${virtualCourtroom.yourItemNumber}` : "—"}
            {virtualCourtroom?.estimatedMinutes != null ? (
              <span className="text-[10px] font-medium text-primary"> · ~{virtualCourtroom.estimatedMinutes}m</span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#1A2332]/45">
        Based on last successful sync — not a webhook live feed unless a contracted provider supplies one.
      </p>
    </section>
  );
}
