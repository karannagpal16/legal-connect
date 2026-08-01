import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

interface PendingUpdate {
  id: string;
  case_id?: string;
  caseId?: string;
  message?: string;
  update_type?: string;
  author_id?: string;
  author_role?: string;
  created_at?: string;
  status?: string;
}

interface PendingReply {
  id: string;
  case_id?: string;
  update_id?: string;
  message?: string;
  author_id?: string;
  author_role?: string;
  created_at?: string;
  status?: string;
}

interface PendingResponse {
  ok: boolean;
  pendingUpdates: PendingUpdate[];
  pendingReplies: PendingReply[];
}

export function AdminPendingUpdates({ embedded = false }: { embedded?: boolean } = {}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-pending-updates"],
    queryFn: () => workspaceRequest<PendingResponse>("/api/admin/pending-updates", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 10_000,
  });

  const action = useMutation({
    mutationFn: ({ id, actionName, kind, reason }: { id: string; actionName: "approve" | "return"; kind: "update" | "reply"; reason?: string }) =>
      workspaceRequest(`/api/admin/pending-updates/${id}/${actionName}`, session?.token, {
        method: "POST",
        body: JSON.stringify({ kind, reason }),
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["admin-pending-updates"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Action failed."),
  });

  if (query.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Loading LC review queue...</p></div>;
  }

  if (query.isError) {
    return (
      <section className="lc-workspace-error">
        <TriangleAlert />
        <div>
          <h2>Review queue unavailable</h2>
          <p>{query.error.message}</p>
        </div>
        <button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button>
      </section>
    );
  }

  const updates = query.data?.pendingUpdates || [];
  const replies = query.data?.pendingReplies || [];

  const body = (
    <>
      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}
      <section className="lc-workspace-section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>Case updates ({updates.length})</h3>
          <button className="lc-button" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Loader2 className="lc-spin" /> : <RefreshCw />} Refresh
          </button>
        </div>
        {!updates.length ? <p className="text-muted-foreground">No updates awaiting review.</p> : null}
        <div className="space-y-4">
          {updates.map((item) => {
            const id = item.id;
            return (
              <article key={id} className="lc-workspace-card" style={{ padding: "1rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12 }}>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  Case {item.case_id || item.caseId || "—"} · {item.author_role || "counsel"} · {item.update_type || "progress"}
                </p>
                <p style={{ margin: "0.5rem 0 1rem", whiteSpace: "pre-wrap" }}>{item.message}</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    className="lc-button lc-button-primary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id, actionName: "approve", kind: "update" })}
                  >
                    <Check /> Approve
                  </button>
                  <input
                    value={returnReasons[`u-${id}`] || ""}
                    onChange={(event) => setReturnReasons((current) => ({ ...current, [`u-${id}`]: event.target.value }))}
                    placeholder="Return reason"
                    style={{ minWidth: 180, padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                  />
                  <button
                    className="lc-button"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id, actionName: "return", kind: "update", reason: returnReasons[`u-${id}`] })}
                  >
                    <RotateCcw /> Return
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lc-workspace-section" style={{ marginTop: "2rem" }}>
        <h3>Client / party replies ({replies.length})</h3>
        {!replies.length ? <p className="text-muted-foreground">No replies awaiting review.</p> : null}
        <div className="space-y-4">
          {replies.map((item) => {
            const id = item.id;
            return (
              <article key={id} className="lc-workspace-card" style={{ padding: "1rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12 }}>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  Case {item.case_id || "—"} · update {item.update_id || "—"} · {item.author_role || "client"}
                </p>
                <p style={{ margin: "0.5rem 0 1rem", whiteSpace: "pre-wrap" }}>{item.message}</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    className="lc-button lc-button-primary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id, actionName: "approve", kind: "reply" })}
                  >
                    <Check /> Approve
                  </button>
                  <input
                    value={returnReasons[`r-${id}`] || ""}
                    onChange={(event) => setReturnReasons((current) => ({ ...current, [`r-${id}`]: event.target.value }))}
                    placeholder="Return reason"
                    style={{ minWidth: 180, padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                  />
                  <button
                    className="lc-button"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id, actionName: "return", kind: "reply", reason: returnReasons[`r-${id}`] })}
                  >
                    <RotateCcw /> Return
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );

  if (embedded) return body;
  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">LC SUPERVISION</span>
          <h2>Pending case communications</h2>
          <p>Approve or return advocate updates and client replies before they reach the other party.</p>
        </div>
      </section>
      {body}
    </div>
  );
}
