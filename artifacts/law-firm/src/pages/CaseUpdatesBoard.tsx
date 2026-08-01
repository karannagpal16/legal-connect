import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

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

export function CaseUpdatesBoard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const role = String(session?.user.role || "client");
  const isAdvocate = role === "advocate" || role === "intern" || role === "admin";
  const [caseId, setCaseId] = useState("");
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

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

  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">LC-SUPERVISED THREAD</span>
          <h2>{isAdvocate ? "Post case updates" : "Case updates"}</h2>
          <p>
            {isAdvocate
              ? "Updates go to Legal Connect review before the client can see them."
              : "Approved counsel updates appear here. Your replies are also reviewed by Legal Connect."}
          </p>
        </div>
        <button className="lc-button" onClick={() => updatesQuery.refetch()} disabled={updatesQuery.isFetching}>
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

      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}

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
    </div>
  );
}
