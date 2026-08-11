import { Loader2, RefreshCw } from "lucide-react";
import { CourtFreshnessBadge } from "./CourtFreshnessBadge";

export function CourtSyncState({
  freshness,
  lastSuccessAt,
  lastSyncStatus,
  consecutiveFailures,
  syncing,
  onRefresh,
  canRefresh,
}: {
  freshness?: string | null;
  lastSuccessAt?: string | null;
  lastSyncStatus?: string | null;
  consecutiveFailures?: number | null;
  syncing?: boolean;
  onRefresh?: () => void;
  canRefresh?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1A2332]/10 px-3 py-2.5">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A2332]/35">Sync activity</p>
        <CourtFreshnessBadge freshness={freshness} lastSuccessAt={lastSuccessAt} />
        <p className="text-[11px] text-[#1A2332]/45">
          Status: {lastSyncStatus || "unknown"}
          {consecutiveFailures ? ` · ${consecutiveFailures} consecutive failure(s)` : ""}
        </p>
      </div>
      {canRefresh && onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2332]/15 px-3 py-2 text-xs font-bold text-[#1A2332]/70 hover:bg-[#1A2332]/5 disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      ) : null}
    </div>
  );
}
