import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import {
  CourtEventTimeline,
  CourtOrdersList,
  CourtStatusCard,
  CourtSyncState,
  HearingCountdown,
} from "@/components/court";

interface CaseRow {
  id: string;
  title?: string;
  caseTitle?: string;
  caseNumber?: string;
  status?: string;
}

interface CaseUpdate {
  id: string;
  message?: string;
  status?: string;
  update_type?: string;
  author_role?: string;
  return_reason?: string;
  created_at?: string;
  replies?: Array<{
    id: string;
    message?: string;
    status?: string;
    author_role?: string;
    return_reason?: string;
    created_at?: string;
  }>;
}

type WorkspaceTab = "counsel" | "status" | "hearings" | "orders" | "sync";

interface TrackedCourtCase {
  id: string;
  cnr?: string;
  caseNumber?: string;
  linkedMatterId?: string | null;
  freshness?: string;
  lastSuccessAt?: string | null;
  lastSyncStatus?: string | null;
  consecutiveFailures?: number;
  sourceUrl?: string | null;
  provider?: string;
  courtName?: string;
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
  } | null;
}

export function CaseUpdatesBoard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const role = String(session?.user.role || "client");
  const isAdvocate = role === "advocate" || role === "intern" || role === "admin";
  const [caseId, setCaseId] = useState("");
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkspaceTab>("counsel");

  const casesQuery = useQuery({
    queryKey: ["workspace-cases-for-updates", session?.user.id],
    queryFn: async () => {
      const payload = await workspaceRequest<{ cases?: CaseRow[]; ok?: boolean }>("/api/cases", session?.token);
      return Array.isArray(payload) ? payload as CaseRow[] : (payload.cases || []);
    },
    enabled: Boolean(session?.token),
    staleTime: 20_000,
  });

  const selectedCaseId = caseId || casesQuery.data?.[0]?.id || "";

  const updatesQuery = useQuery({
    queryKey: ["case-updates", selectedCaseId],
    queryFn: () => workspaceRequest<{ updates: CaseUpdate[] }>(`/api/cases/${selectedCaseId}/updates`, session?.token),
    enabled: Boolean(session?.token && selectedCaseId),
    staleTime: 8_000,
  });

  const courtListQuery = useQuery({
    queryKey: ["court-cases", session?.user.id],
    queryFn: () => workspaceRequest<{ cases: TrackedCourtCase[] }>("/api/court-cases", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
  });

  const linkedCourtCase = useMemo(() => {
    const cases = courtListQuery.data?.cases || [];
    return cases.find((item) => item.linkedMatterId && item.linkedMatterId === selectedCaseId) || cases[0] || null;
  }, [courtListQuery.data, selectedCaseId]);

  const courtDetailQuery = useQuery({
    queryKey: ["court-case-detail", linkedCourtCase?.id],
    queryFn: () => workspaceRequest<{
      case: TrackedCourtCase;
      snapshot: TrackedCourtCase["latestSnapshot"];
      hearingHistory: Array<{ id: string; eventType?: string; eventDate?: string | null; purpose?: string | null; stage?: string | null; courtNumber?: string | null; judgeOrBench?: string | null; causeListItemNumber?: string | null }>;
      orders: Array<{ id: string; title?: string | null; documentDate?: string | null; officialSourceUrl?: string | null; isOfficial?: boolean }>;
      disclaimer?: string;
    }>(`/api/court-cases/${linkedCourtCase!.id}`, session?.token),
    enabled: Boolean(session?.token && linkedCourtCase?.id && tab !== "counsel"),
    staleTime: 10_000,
  });

  const postUpdate = useMutation({
    mutationFn: () =>
      workspaceRequest(`/api/cases/${selectedCaseId}/updates`, session?.token, {
        method: "POST",
        body: JSON.stringify({ message, updateType: "progress" }),
      }),
    onSuccess: () => {
      setMessage("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["case-updates", selectedCaseId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not submit update."),
  });

  const postReply = useMutation({
    mutationFn: ({ updateId, reply }: { updateId: string; reply: string }) =>
      workspaceRequest(`/api/cases/${selectedCaseId}/updates/${updateId}/replies`, session?.token, {
        method: "POST",
        body: JSON.stringify({ message: reply }),
      }),
    onSuccess: (_data, variables) => {
      setReplyDrafts((current) => ({ ...current, [variables.updateId]: "" }));
      setError("");
      queryClient.invalidateQueries({ queryKey: ["case-updates", selectedCaseId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not submit reply."),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      workspaceRequest(`/api/court-cases/${linkedCourtCase!.id}/sync`, session?.token, { method: "POST", body: "{}" }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["court-case-detail", linkedCourtCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["court-cases", session?.user.id] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not queue sync."),
  });

  const caseOptions = useMemo(() => casesQuery.data || [], [casesQuery.data]);

  const submitUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCaseId) {
      setError("Select a case first.");
      return;
    }
    postUpdate.mutate();
  };

  if (casesQuery.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Loading matters...</p></div>;
  }

  const snap = courtDetailQuery.data?.snapshot || linkedCourtCase?.latestSnapshot || null;
  const tracked = courtDetailQuery.data?.case || linkedCourtCase;

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "counsel", label: "Counsel Updates" },
    { id: "status", label: "Official Court Status" },
    { id: "hearings", label: "Hearing History" },
    { id: "orders", label: "Orders & Judgments" },
    { id: "sync", label: "Sync Activity" },
  ];

  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">CASE WORKSPACE</span>
          <h2>{isAdvocate ? "Matter workspace" : "Your case workspace"}</h2>
          <p>
            Counsel updates stay on the supervised thread. Verified Court Updates appear in a separate panel with source and freshness.
          </p>
        </div>
        <button
          className="lc-button"
          onClick={() => {
            updatesQuery.refetch();
            courtListQuery.refetch();
            if (linkedCourtCase?.id) courtDetailQuery.refetch();
          }}
          disabled={updatesQuery.isFetching}
        >
          {updatesQuery.isFetching ? <Loader2 className="lc-spin" /> : <RefreshCw />} Refresh
        </button>
      </section>

      <label style={{ display: "grid", gap: "0.35rem", marginBottom: "1.25rem", maxWidth: 420 }}>
        <span>Matter</span>
        <select
          value={selectedCaseId}
          onChange={(event) => setCaseId(event.target.value)}
          style={{ padding: "0.7rem 0.85rem", borderRadius: 10, border: "1px solid var(--border, #d0d5dd)" }}
        >
          {!caseOptions.length ? <option value="">No matters available</option> : null}
          {caseOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || item.caseTitle || item.caseNumber || item.id}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
              tab === item.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-[#1A2332]/10 text-[#1A2332]/50 hover:text-[#1A2332]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}

      {tab === "counsel" ? (
        <>
          {isAdvocate ? (
            <form onSubmit={submitUpdate} style={{ display: "grid", gap: "0.75rem", marginBottom: "1.75rem" }}>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="Hearing note, next step, or document request for LC review..."
                style={{ padding: "0.85rem", borderRadius: 12, border: "1px solid var(--border, #d0d5dd)" }}
                required
              />
              <button className="lc-button lc-button-primary" disabled={postUpdate.isPending || !selectedCaseId} style={{ width: "fit-content" }}>
                {postUpdate.isPending ? <Loader2 className="lc-spin" /> : <Send />} Submit for LC review
              </button>
            </form>
          ) : null}

          {updatesQuery.isError ? (
            <section className="lc-workspace-error">
              <TriangleAlert />
              <div><h2>Updates unavailable</h2><p>{updatesQuery.error.message}</p></div>
            </section>
          ) : null}

          <div className="space-y-4">
            {(updatesQuery.data?.updates || []).map((update) => (
              <article key={update.id} style={{ padding: "1rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12 }}>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  {update.author_role || "counsel"} · {update.status || "pending"} · {update.update_type || "progress"}
                </p>
                <p style={{ whiteSpace: "pre-wrap", margin: "0.5rem 0" }}>{update.message}</p>
                {update.return_reason ? <p style={{ color: "#b42318" }}>Returned: {update.return_reason}</p> : null}

                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.65rem" }}>
                  {(update.replies || []).map((reply) => (
                    <div key={reply.id} style={{ padding: "0.65rem 0.75rem", background: "rgba(0,0,0,0.03)", borderRadius: 8 }}>
                      <p style={{ fontSize: 12, opacity: 0.7 }}>{reply.author_role || "party"} · {reply.status}</p>
                      <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{reply.message}</p>
                      {reply.return_reason ? <p style={{ color: "#b42318", margin: "0.35rem 0 0" }}>Returned: {reply.return_reason}</p> : null}
                    </div>
                  ))}
                </div>

                {role === "client" && update.status === "approved" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      postReply.mutate({ updateId: update.id, reply: replyDrafts[update.id] || "" });
                    }}
                    style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}
                  >
                    <input
                      value={replyDrafts[update.id] || ""}
                      onChange={(event) => setReplyDrafts((current) => ({ ...current, [update.id]: event.target.value }))}
                      placeholder="Reply for LC review"
                      style={{ flex: 1, minWidth: 200, padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      required
                    />
                    <button className="lc-button lc-button-primary" disabled={postReply.isPending}>
                      {postReply.isPending ? <Loader2 className="lc-spin" /> : <Send />} Reply
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
            {!updatesQuery.isLoading && !(updatesQuery.data?.updates || []).length ? (
              <p className="text-muted-foreground">No supervised updates on this matter yet.</p>
            ) : null}
          </div>
        </>
      ) : null}

      {tab !== "counsel" && !tracked ? (
        <section className="rounded-2xl border border-[#1A2332]/10 p-5 space-y-2">
          <h3 className="text-sm font-bold text-[#1A2332]">No tracked court case yet</h3>
          <p className="text-sm text-[#1A2332]/55">
            Advocates can search a CNR and start Verified Court Updates from the Firm Case Tracker. Clients see official status here once a case is tracked and linked.
          </p>
        </section>
      ) : null}

      {tab === "status" && tracked ? (
        <div className="space-y-3">
          <HearingCountdown nextHearingDate={snap?.nextHearingDate} />
          <CourtStatusCard
            status={snap?.status}
            stage={snap?.stage}
            nextHearingDate={snap?.nextHearingDate}
            hearingConfirmed={snap?.hearingConfirmed}
            courtRoom={snap?.courtRoom}
            causeListItemNumber={snap?.causeListItemNumber}
            judgeOrBench={snap?.judgeOrBench}
            freshness={tracked.freshness}
            lastSuccessAt={tracked.lastSuccessAt}
            sourceUrl={tracked.sourceUrl}
            sourceCourt={snap?.courtName || tracked.courtName}
            provider={tracked.provider}
            disclaimer={courtDetailQuery.data?.disclaimer || tracked.disclaimer}
          />
        </div>
      ) : null}

      {tab === "hearings" && tracked ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
          <h3 className="text-sm font-bold text-[#1A2332] mb-3">Hearing History</h3>
          <CourtEventTimeline events={courtDetailQuery.data?.hearingHistory || []} />
        </section>
      ) : null}

      {tab === "orders" && tracked ? (
        <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
          <h3 className="text-sm font-bold text-[#1A2332] mb-3">Orders & Judgments</h3>
          <CourtOrdersList orders={courtDetailQuery.data?.orders || []} />
        </section>
      ) : null}

      {tab === "sync" && tracked ? (
        <CourtSyncState
          freshness={tracked.freshness}
          lastSuccessAt={tracked.lastSuccessAt}
          lastSyncStatus={tracked.lastSyncStatus}
          consecutiveFailures={tracked.consecutiveFailures}
          syncing={syncMutation.isPending}
          canRefresh={isAdvocate}
          onRefresh={() => syncMutation.mutate()}
        />
      ) : null}
    </div>
  );
}
