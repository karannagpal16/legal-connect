import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle, ExternalLink, Gavel, Hash, Loader2, RefreshCw, Search, Scale, Landmark, Building2, ListOrdered, Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import {
  CourtCaseSearch,
  CourtFreshnessBadge,
  CourtOrdersList,
  CourtStatusCard,
  CourtSyncState,
  HearingCountdown,
  TrackCaseDialog,
} from "@/components/court";

type CourtLevel = "all" | "district" | "high_court" | "supreme_court" | "tribunal";

interface TrackedCourtCase {
  id: string;
  cnr?: string | null;
  caseNumber?: string | null;
  caseType?: string | null;
  courtLevel?: string;
  courtName?: string | null;
  title?: string | null;
  provider?: string;
  sourceUrl?: string | null;
  freshness?: string;
  lastSuccessAt?: string | null;
  lastSyncStatus?: string | null;
  consecutiveFailures?: number;
  trackingStatus?: string;
  nextSyncAt?: string | null;
  linkedMatterId?: string | null;
  disclaimer?: string;
  latestSnapshot?: {
    status?: string;
    stage?: string;
    nextHearingDate?: string | null;
    hearingConfirmed?: boolean;
    courtRoom?: string | null;
    causeListItemNumber?: string | null;
    judgeOrBench?: string | null;
    courtName?: string;
    parties?: { petitioners?: string[]; respondents?: string[] };
    advocates?: string[];
  } | null;
}

interface SearchResult {
  providerCaseId: string;
  cnr?: string;
  caseNumber?: string;
  courtName?: string;
  status?: string;
  stage?: string;
  nextHearingDate?: string | null;
  hearingConfirmed?: boolean;
  sourceUrl?: string;
  provider?: string;
  parties?: { petitioners?: string[]; respondents?: string[] };
}

const officialLinks = [
  { title: "eCourts Case Status", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: Search, color: "from-blue-500 to-cyan-500" },
  { title: "Cause List", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: ListOrdered, color: "from-emerald-500 to-teal-500" },
  { title: "View Orders / Judgments", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: Eye, color: "from-violet-500 to-purple-500" },
  { title: "SCI Portal", url: "https://www.sci.gov.in/", icon: Landmark, color: "from-amber-500 to-orange-500" },
  { title: "Delhi HC", url: "https://delhihighcourt.nic.in/", icon: Building2, color: "from-rose-500 to-pink-500" },
  { title: "NJDG", url: "https://njdg.ecourts.gov.in/njdgnew/", icon: Scale, color: "from-indigo-500 to-blue-500" },
];

export function AdvocateCaseTracker() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [expandedCase, setExpandedCase] = useState<string>("");
  const [courtFilter, setCourtFilter] = useState<CourtLevel>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);

  const listQuery = useQuery({
    queryKey: ["court-cases-advocate", session?.user.id],
    queryFn: () => workspaceRequest<{ cases: TrackedCourtCase[]; disclaimer?: string }>("/api/court-cases", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 10_000,
  });

  const cases = listQuery.data?.cases || [];
  const selectedId = expandedCase || cases[0]?.id || "";

  const detailQuery = useQuery({
    queryKey: ["court-case-detail-advocate", selectedId],
    queryFn: () => workspaceRequest<{
      case: TrackedCourtCase;
      snapshot: TrackedCourtCase["latestSnapshot"];
      hearingHistory: Array<{ id: string; eventDate?: string | null; stage?: string | null; purpose?: string | null; courtNumber?: string | null; judgeOrBench?: string | null; causeListItemNumber?: string | null }>;
      orders: Array<{ id: string; title?: string | null; documentDate?: string | null; officialSourceUrl?: string | null; isOfficial?: boolean }>;
      changeEvents: Array<{ id: string; eventType?: string; summary?: string; createdAt?: string }>;
      disclaimer?: string;
    }>(`/api/court-cases/${selectedId}`, session?.token),
    enabled: Boolean(session?.token && selectedId),
    staleTime: 8_000,
  });

  const searchMutation = useMutation({
    mutationFn: (cnr: string) =>
      workspaceRequest<{ results: SearchResult[]; message?: string; unsupported?: boolean; reason?: string }>("/api/court-cases/search", session?.token, {
        method: "POST",
        body: JSON.stringify({ cnr }),
      }),
    onSuccess: (payload) => {
      setError("");
      if (payload.unsupported) {
        setPreview(null);
        setError(payload.reason || "Search not supported by active provider.");
        return;
      }
      if (!payload.results?.length) {
        setPreview(null);
        setError(payload.message || "No case found for that CNR.");
        return;
      }
      setPreview(payload.results[0]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Search failed."),
  });

  const trackMutation = useMutation({
    mutationFn: (opts: { linkedMatterId?: string; confirmLinkMatter: boolean }) =>
      workspaceRequest("/api/court-cases/track", session?.token, {
        method: "POST",
        body: JSON.stringify({
          cnr: preview?.cnr,
          providerCaseId: preview?.providerCaseId,
          linkedMatterId: opts.linkedMatterId,
          confirmLinkMatter: opts.confirmLinkMatter,
        }),
      }),
    onSuccess: (payload: { case?: TrackedCourtCase }) => {
      setPreview(null);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["court-cases-advocate", session?.user.id] });
      if (payload.case?.id) setExpandedCase(payload.case.id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not track case."),
  });

  const syncMutation = useMutation({
    mutationFn: (caseId: string) =>
      workspaceRequest(`/api/court-cases/${caseId}/sync`, session?.token, { method: "POST", body: "{}" }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["court-cases-advocate", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["court-case-detail-advocate", selectedId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not queue refresh."),
  });

  const untrackMutation = useMutation({
    mutationFn: (caseId: string) =>
      workspaceRequest(`/api/court-cases/${caseId}/tracking`, session?.token, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["court-cases-advocate", session?.user.id] });
    },
  });

  const filtered = useMemo(() => {
    return cases.filter((item) => {
      if (courtFilter !== "all" && item.courtLevel !== courtFilter) return false;
      if (staleOnly && item.freshness !== "stale" && item.freshness !== "sync_unavailable") return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [item.cnr, item.caseNumber, item.title, item.courtName, item.latestSnapshot?.stage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [cases, courtFilter, query, staleOnly]);

  const selected = detailQuery.data?.case || cases.find((item) => item.id === selectedId) || null;
  const snap = detailQuery.data?.snapshot || selected?.latestSnapshot || null;
  const staleCount = cases.filter((item) => item.freshness === "stale" || item.freshness === "sync_unavailable").length;
  const hearingSoon = cases.filter((item) => {
    const raw = item.latestSnapshot?.nextHearingDate;
    if (!raw) return false;
    const days = (Date.parse(String(raw).slice(0, 10)) - Date.now()) / (24 * 3600 * 1000);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1A2332]">Verified Court Updates</h1>
            <p className="text-[#1A2332]/40 text-xs mt-0.5">
              District CNR tracking · official source links · twice-daily sync (not real-time)
            </p>
          </div>
        </div>
        <button
          onClick={() => listQuery.refetch()}
          disabled={listQuery.isFetching}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-[#1A2332]/5 hover:bg-[#1A2332]/10 border-[#1A2332]/10 text-[#1A2332]/60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${listQuery.isFetching ? "animate-spin" : ""}`} />
          Reload tracked cases
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-xl p-4">
          <p className="text-[#1A2332]/25 text-[10px] uppercase tracking-wider font-bold">Tracked</p>
          <p className="text-[#1A2332] text-2xl font-black mt-1">{cases.length}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-xl p-4">
          <p className="text-[#1A2332]/25 text-[10px] uppercase tracking-wider font-bold">Stale / unavailable</p>
          <p className="text-amber-600 text-2xl font-black mt-1">{staleCount}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-xl p-4">
          <p className="text-[#1A2332]/25 text-[10px] uppercase tracking-wider font-bold">Hearings this week</p>
          <p className="text-primary text-2xl font-black mt-1">{hearingSoon}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-xl p-4">
          <p className="text-[#1A2332]/25 text-[10px] uppercase tracking-wider font-bold">Provider</p>
          <p className="text-[#1A2332] text-sm font-bold mt-2">{cases[0]?.provider || "fixture / pending"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {officialLinks.map((link) => (
          <a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer" className="group bg-card/40 border border-[#1A2332]/10 hover:border-[#1A2332]/20 rounded-xl p-2.5 transition-all hover:bg-card/60 flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0`}>
              <link.icon className="w-3.5 h-3.5 text-[#1A2332]" />
            </div>
            <p className="text-[#1A2332] text-[10px] font-bold group-hover:text-primary transition-colors leading-tight truncate">
              {link.title} <ExternalLink className="w-2 h-2 text-[#1A2332]/20 inline" />
            </p>
          </a>
        ))}
      </div>

      <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4 space-y-3">
        <CourtCaseSearch
          searching={searchMutation.isPending}
          onSearch={(cnr) => searchMutation.mutate(cnr)}
          hint="Demo fixtures: DLSA010012342024 or DLCT010098762023. Search does not auto-track."
        />
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}
        {preview ? (
          <TrackCaseDialog
            preview={preview}
            tracking={trackMutation.isPending}
            onCancel={() => setPreview(null)}
            onConfirm={(opts) => trackMutation.mutate(opts)}
          />
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A2332]/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tracked cases by CNR, number, or court..."
            className="w-full bg-card/50 border border-[#1A2332]/10 rounded-xl pl-10 pr-3 py-2.5 text-sm"
          />
        </div>
        {(["all", "district", "high_court", "supreme_court"] as CourtLevel[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setCourtFilter(level)}
            className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold border ${
              courtFilter === level ? "bg-violet-500/15 border-violet-500/30 text-violet-500" : "border-[#1A2332]/10 text-[#1A2332]/40"
            }`}
          >
            {level === "all" ? "All courts" : level.replace("_", " ")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStaleOnly((value) => !value)}
          className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold border ${
            staleOnly ? "bg-amber-500/15 border-amber-500/30 text-amber-700" : "border-[#1A2332]/10 text-[#1A2332]/40"
          }`}
        >
          Stale queue
        </button>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[#1A2332]/50"><Loader2 className="w-4 h-4 animate-spin" /> Loading tracked cases...</div>
      ) : null}

      {!listQuery.isLoading && filtered.length === 0 ? (
        <div className="text-center py-14">
          <Search className="w-10 h-10 text-[#1A2332]/10 mx-auto mb-3" />
          <p className="text-[#1A2332]/40 text-sm font-semibold">No tracked court cases yet</p>
          <p className="text-[#1A2332]/25 text-xs mt-1">Search a CNR above to preview, then start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            {filtered.map((item) => {
              const active = item.id === selectedId;
              const next = item.latestSnapshot?.nextHearingDate;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExpandedCase(item.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    active ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-[#1A2332]/10 bg-card/40 hover:border-[#1A2332]/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#1A2332]">{item.title || item.caseNumber || item.cnr}</p>
                      <p className="text-[11px] text-[#1A2332]/40 mt-0.5">{item.cnr} · {item.courtName || item.courtLevel}</p>
                    </div>
                    <CourtFreshnessBadge freshness={item.freshness} />
                  </div>
                  <p className="text-xs text-[#1A2332]/55 mt-2">
                    {item.latestSnapshot?.stage || item.latestSnapshot?.status || "Status pending"}
                    {next ? ` · Next ${String(next).slice(0, 10)}` : ""}
                  </p>
                  {item.linkedMatterId ? (
                    <p className="text-[10px] text-primary mt-2 font-semibold">Linked matter · {item.linkedMatterId.slice(0, 8)}…</p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selected ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <HearingCountdown nextHearingDate={snap?.nextHearingDate} />
              <CourtStatusCard
                status={snap?.status}
                stage={snap?.stage}
                nextHearingDate={snap?.nextHearingDate}
                hearingConfirmed={snap?.hearingConfirmed}
                courtRoom={snap?.courtRoom}
                causeListItemNumber={snap?.causeListItemNumber}
                judgeOrBench={snap?.judgeOrBench}
                freshness={selected.freshness}
                lastSuccessAt={selected.lastSuccessAt}
                sourceUrl={selected.sourceUrl}
                sourceCourt={snap?.courtName || selected.courtName}
                provider={selected.provider}
                disclaimer={detailQuery.data?.disclaimer || selected.disclaimer || listQuery.data?.disclaimer}
              />
              <CourtSyncState
                freshness={selected.freshness}
                lastSuccessAt={selected.lastSuccessAt}
                lastSyncStatus={selected.lastSyncStatus}
                consecutiveFailures={selected.consecutiveFailures}
                syncing={syncMutation.isPending}
                canRefresh
                onRefresh={() => syncMutation.mutate(selected.id)}
              />
              <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
                <h3 className="text-sm font-bold text-[#1A2332] mb-3">Orders & Judgments</h3>
                <CourtOrdersList orders={detailQuery.data?.orders || []} />
              </section>
              {(detailQuery.data?.changeEvents || []).length ? (
                <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
                  <h3 className="text-sm font-bold text-[#1A2332] mb-2">Recent changes</h3>
                  <ul className="space-y-2">
                    {detailQuery.data!.changeEvents.slice(0, 8).map((event) => (
                      <li key={event.id} className="text-xs text-[#1A2332]/60">
                        <span className="font-semibold text-[#1A2332]">{event.eventType}</span>
                        {event.summary ? ` — ${event.summary}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <button
                type="button"
                onClick={() => untrackMutation.mutate(selected.id)}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Stop tracking
              </button>
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}
