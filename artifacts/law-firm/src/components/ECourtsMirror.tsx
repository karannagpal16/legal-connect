import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Gavel, Landmark, Loader2, Scale } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { CourtCaseSearch } from "@/components/court/CourtCaseSearch";
import { CourtEventTimeline } from "@/components/court/CourtEventTimeline";
import { CourtFreshnessBadge } from "@/components/court/CourtFreshnessBadge";
import { CourtOrdersList } from "@/components/court/CourtOrdersList";
import { CourtSourceBadge } from "@/components/court/CourtSourceBadge";
import { CourtStatusCard } from "@/components/court/CourtStatusCard";
import { HearingCountdown } from "@/components/court/HearingCountdown";
import { OrderPDFViewerModal } from "@/components/court/OrderPDFViewerModal";
import { StageMilestoneBar } from "@/components/court/StageMilestoneBar";
import { TrackCaseDialog } from "@/components/court/TrackCaseDialog";
import { VirtualCourtroomWidget } from "@/components/court/VirtualCourtroomWidget";

type CourtTab = "district" | "high" | "supreme";

const DEMO_CNRS = ["DLCT010012342023", "DLSA010012342024", "DLCT010098762023"];

const HIGH_COURTS = [
  "Allahabad", "Andhra Pradesh", "Bombay", "Calcutta", "Chhattisgarh",
  "Delhi", "Gauhati", "Gujarat", "Himachal Pradesh", "Jammu & Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Madras",
  "Manipur", "Meghalaya", "Orissa", "Patna", "Punjab & Haryana",
  "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttarakhand",
];

interface MirrorResult {
  providerCaseId?: string;
  cnr?: string;
  caseNumber?: string;
  courtName?: string;
  status?: string;
  stage?: string;
  nextHearingDate?: string | null;
  hearingConfirmed?: boolean;
  courtRoom?: string | null;
  causeListItemNumber?: string | null;
  judgeOrBench?: string | null;
  sourceUrl?: string;
  provider?: string;
  milestones?: { activeIndex?: number; steps?: Array<{ index: number; label: string; state?: string }> };
  virtualCourtroom?: {
    liveOnCauseList?: boolean;
    courtRoom?: string | null;
    currentItemNumber?: string | null;
    yourItemNumber?: string | null;
    estimatedMinutes?: number | null;
    headline?: string;
    badge?: string;
  };
  history?: Array<{ hearingDate?: string; businessOnDate?: string; stage?: string; courtRoom?: string; purpose?: string }>;
  orders?: Array<{ id: string; title?: string; documentDate?: string; sourceUrl?: string; official?: boolean; officialSourceUrl?: string }>;
  parties?: { petitioners?: string[]; respondents?: string[] };
}

export function ECourtsMirror({
  mode = "full",
  showCauseList = false,
}: {
  mode?: "full" | "compact";
  showCauseList?: boolean;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CourtTab>("district");
  const [preview, setPreview] = useState<MirrorResult | null>(null);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [hcState, setHcState] = useState("Delhi");
  const [sciDiary, setSciDiary] = useState("");
  const [sciYear, setSciYear] = useState(String(new Date().getFullYear()));

  const listQuery = useQuery({
    queryKey: ["court-sync-cases-mirror", session?.user.id],
    queryFn: () => workspaceRequest<{
      cases: any[];
      causeListToday?: any[];
      disclaimer?: string;
    }>("/api/court-sync/cases", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 10_000,
  });

  const searchMutation = useMutation({
    mutationFn: (cnr: string) =>
      workspaceRequest<{ results: MirrorResult[]; message?: string; unsupported?: boolean; reason?: string }>(
        "/api/court-sync/search-cnr",
        session?.token,
        { method: "POST", body: JSON.stringify({ cnrNumber: cnr }) },
      ),
    onSuccess: (payload) => {
      setError("");
      if (payload.unsupported) {
        setPreview(null);
        setError(payload.reason || "Search not supported.");
        return;
      }
      if (!payload.results?.length) {
        setPreview(null);
        setError(payload.message || "No case found.");
        return;
      }
      setPreview(payload.results[0]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Search failed."),
  });

  const caseSearchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      workspaceRequest<{ unsupported?: boolean; reason?: string; results?: MirrorResult[]; officialPortal?: string; officialPortals?: Record<string, string> }>(
        "/api/court-sync/search-case",
        session?.token,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (payload) => {
      if (payload.unsupported) {
        setPreview(null);
        setError(payload.reason || "Not enabled yet.");
        return;
      }
      setError("");
      setPreview(payload.results?.[0] || null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Search failed."),
  });

  const trackMutation = useMutation({
    mutationFn: (opts: { linkedMatterId?: string; confirmLinkMatter: boolean }) =>
      workspaceRequest("/api/court-sync/track", session?.token, {
        method: "POST",
        body: JSON.stringify({
          cnr: preview?.cnr,
          providerCaseId: preview?.providerCaseId,
          linkedMatterId: opts.linkedMatterId,
          confirmLinkMatter: opts.confirmLinkMatter,
        }),
      }),
    onSuccess: () => {
      setPreview(null);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["court-sync-cases-mirror", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["court-cases-advocate", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["court-cases", session?.user.id] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not track case."),
  });

  const orders = useMemo(() => {
    return (preview?.orders || []).map((order) => ({
      id: order.id,
      title: order.title,
      documentDate: order.documentDate,
      officialSourceUrl: order.officialSourceUrl || order.sourceUrl,
      isOfficial: order.official !== false,
    }));
  }, [preview]);

  const history = useMemo(() => {
    return (preview?.history || []).map((row, index) => ({
      id: `preview-hist-${index}`,
      eventDate: row.hearingDate,
      stage: row.stage,
      purpose: row.purpose || row.businessOnDate,
      courtNumber: row.courtRoom,
    }));
  }, [preview]);

  return (
    <div className={`space-y-4 ${mode === "compact" ? "" : ""}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A2332]/8 border border-[#1A2332]/15 flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#1A2332]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#1A2332]">eCourts Mirror</h2>
            <p className="text-[#1A2332]/45 text-xs mt-0.5">
              Verified Court Updates · source-linked · fixture/demo until a commercial provider is contracted
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { id: "district" as const, label: "District Courts", icon: Gavel },
          { id: "high" as const, label: "High Courts (25)", icon: Building2 },
          { id: "supreme" as const, label: "Supreme Court", icon: Landmark },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); setError(""); setPreview(null); }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
              tab === item.id ? "border-primary/40 bg-primary/10 text-primary" : "border-[#1A2332]/10 text-[#1A2332]/50"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "district" ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4 space-y-3">
          <CourtCaseSearch
            searching={searchMutation.isPending}
            onSearch={(cnr) => searchMutation.mutate(cnr)}
            hint="16 alphanumeric characters. Demo: DLCT010012342023"
          />
          <div className="flex flex-wrap gap-2">
            {DEMO_CNRS.map((cnr) => (
              <button
                key={cnr}
                type="button"
                onClick={() => searchMutation.mutate(cnr)}
                className="rounded-lg border border-[#1A2332]/15 px-2.5 py-1.5 text-[10px] font-bold text-[#1A2332]/60 hover:border-primary/40 hover:text-primary"
              >
                {cnr}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "high" ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4 space-y-3">
          <p className="text-sm text-[#1A2332]/60">
            High Court adapters publish a coverage list. Automated search stays disabled until an approved provider is contracted.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={hcState}
              onChange={(event) => setHcState(event.target.value)}
              className="rounded-xl border border-[#1A2332]/15 px-3 py-2 text-sm"
            >
              {HIGH_COURTS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => caseSearchMutation.mutate({
                courtLevel: "high_court",
                stateCode: hcState,
                caseType: "WP",
                caseNumber: "1",
                caseYear: 2026,
              })}
              className="rounded-xl bg-[#1A2332] px-4 py-2 text-xs font-bold text-[#F7F4EE]"
            >
              {caseSearchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check coverage"}
            </button>
            <a href="https://hcservices.ecourts.gov.in/hcservices/" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#1A2332]/15 px-4 py-2 text-xs font-bold text-[#1A2332]/60">
              Open HC services
            </a>
          </div>
        </section>
      ) : null}

      {tab === "supreme" ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4 space-y-3">
          <p className="text-sm text-[#1A2332]/60">
            Supreme Court uses diary/case identifiers — not a fake CNR. Search enables in Phase 5.
          </p>
          <div className="flex flex-wrap gap-2">
            <input value={sciDiary} onChange={(e) => setSciDiary(e.target.value)} placeholder="Diary number" className="rounded-xl border border-[#1A2332]/15 px-3 py-2 text-sm" />
            <input value={sciYear} onChange={(e) => setSciYear(e.target.value)} placeholder="Year" className="w-28 rounded-xl border border-[#1A2332]/15 px-3 py-2 text-sm" />
            <button
              type="button"
              onClick={() => caseSearchMutation.mutate({ diaryNumber: sciDiary, diaryYear: Number(sciYear) })}
              className="rounded-xl bg-[#1A2332] px-4 py-2 text-xs font-bold text-[#F7F4EE]"
            >
              Search SCI
            </button>
            <a href="https://www.sci.gov.in/daily-order-diary-no/" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#1A2332]/15 px-4 py-2 text-xs font-bold text-[#1A2332]/60">
              Daily orders
            </a>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-xs text-rose-600 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2">{error}</p> : null}

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#1A2332]">{preview.caseNumber || preview.cnr}</p>
              <p className="text-[11px] text-[#1A2332]/45">{preview.courtName}</p>
            </div>
            <CourtFreshnessBadge freshness="live" />
          </div>
          <HearingCountdown nextHearingDate={preview.nextHearingDate} />
          <VirtualCourtroomWidget virtualCourtroom={preview.virtualCourtroom} />
          <StageMilestoneBar milestones={preview.milestones} />
          <CourtStatusCard
            status={preview.status}
            stage={preview.stage}
            nextHearingDate={preview.nextHearingDate}
            hearingConfirmed={preview.hearingConfirmed}
            courtRoom={preview.courtRoom}
            causeListItemNumber={preview.causeListItemNumber}
            judgeOrBench={preview.judgeOrBench}
            freshness="live"
            sourceUrl={preview.sourceUrl}
            sourceCourt={preview.courtName}
            provider={preview.provider}
            disclaimer="Court records prevail over Legal Connect."
          />
          <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
            <h3 className="text-sm font-bold text-[#1A2332] mb-3">Hearing History</h3>
            <CourtEventTimeline events={history} />
          </section>
          <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
            <h3 className="text-sm font-bold text-[#1A2332] mb-3">Orders & Judgments</h3>
            <CourtOrdersList
              orders={orders}
              onDownload={(orderId) => {
                const hit = orders.find((item) => item.id === orderId) || null;
                setSelectedOrder(hit);
              }}
            />
          </section>
          <CourtSourceBadge sourceUrl={preview.sourceUrl} sourceCourt={preview.courtName} provider={preview.provider} />
          <TrackCaseDialog
            preview={preview}
            tracking={trackMutation.isPending}
            onCancel={() => setPreview(null)}
            onConfirm={(opts) => trackMutation.mutate(opts)}
          />
        </div>
      ) : null}

      {showCauseList ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
          <h3 className="text-sm font-bold text-[#1A2332] mb-3">Today’s Cause List Aggregator</h3>
          {(listQuery.data?.causeListToday || []).length ? (
            <ul className="space-y-2">
              {listQuery.data!.causeListToday!.map((item) => (
                <li key={item.caseId} className="rounded-xl border border-[#1A2332]/10 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1A2332]">{item.title}</p>
                    <p className="text-[11px] text-[#1A2332]/45">
                      {item.courtName} · {item.courtRoom || "Room n/a"} · Item {item.itemNumber || "n/a"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.liveOnCauseList ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-md">LIVE</span>
                    ) : null}
                    <CourtFreshnessBadge freshness={item.freshness} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#1A2332]/40">No tracked hearings for today yet. Track a CNR listed today (demo: DLCT010012342023).</p>
          )}
        </section>
      ) : null}

      <OrderPDFViewerModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        token={session?.token}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
