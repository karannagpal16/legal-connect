import { CourtFreshnessBadge } from "./CourtFreshnessBadge";
import { CourtSourceBadge } from "./CourtSourceBadge";

export function CourtStatusCard({
  status,
  stage,
  nextHearingDate,
  hearingConfirmed,
  courtRoom,
  causeListItemNumber,
  judgeOrBench,
  freshness,
  lastSuccessAt,
  sourceUrl,
  sourceCourt,
  provider,
  disclaimer,
}: {
  status?: string | null;
  stage?: string | null;
  nextHearingDate?: string | null;
  hearingConfirmed?: boolean;
  courtRoom?: string | null;
  causeListItemNumber?: string | null;
  judgeOrBench?: string | null;
  freshness?: string | null;
  lastSuccessAt?: string | null;
  sourceUrl?: string | null;
  sourceCourt?: string | null;
  provider?: string | null;
  disclaimer?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1A2332]">Official Court Status</h3>
        <CourtFreshnessBadge freshness={freshness} lastSuccessAt={lastSuccessAt} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Stage</p>
          <p className="text-sm font-semibold text-[#1A2332] mt-0.5">{stage || status || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Next hearing</p>
          <p className="text-sm font-semibold text-[#1A2332] mt-0.5">
            {nextHearingDate ? String(nextHearingDate).slice(0, 10) : "Not published"}
          </p>
          <p className="text-[10px] text-[#1A2332]/45 mt-0.5">
            {nextHearingDate
              ? (hearingConfirmed ? "Confirmed by source" : "Scheduled (unconfirmed)")
              : "Awaiting court listing"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#1A2332]/35 font-semibold">Bench / room</p>
          <p className="text-sm font-semibold text-[#1A2332] mt-0.5">{judgeOrBench || "—"}</p>
          <p className="text-[10px] text-[#1A2332]/45 mt-0.5">
            {courtRoom || "Courtroom not supplied"}
            {causeListItemNumber ? ` · Item ${causeListItemNumber}` : ""}
          </p>
        </div>
      </div>
      <CourtSourceBadge sourceUrl={sourceUrl} sourceCourt={sourceCourt} provider={provider} />
      {disclaimer ? <p className="text-[11px] leading-relaxed text-[#1A2332]/50">{disclaimer}</p> : null}
    </section>
  );
}
