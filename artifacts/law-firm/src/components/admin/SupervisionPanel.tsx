import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, LifeBuoy, ShieldAlert, UserX } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { DashboardPanel, EmptyState, StatusPill } from "@/components/dashboard/DashboardParts";

/**
 * LC Admin supervision desk: everything waiting on Legal Connect, plus the SOS and
 * account-deletion requests that only admin can handle. Data comes from
 * /api/admin/supervision, /api/admin/sos and /api/admin/deletion-requests.
 */

type QueueItem = { key: string; label: string; count: number; href: string };
type SupervisionResponse = { ok: boolean; totalNeedingAttention: number; queue: QueueItem[]; suspendedAccounts: number };
type SosRow = { id: string; service_type?: string; urgency?: string; status?: string; created_at?: string; requester_name?: string; requester_email?: string; requester_phone?: string };
type DeletionRow = { id: string; status?: string; requestedAt?: string; requested_at?: string; createdAt?: string; userName?: string; userEmail?: string; emailMasked?: string; name?: string };

function when(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function askNote(message: string): string | null {
  const value = window.prompt(message);
  if (value === null) return null;
  const note = value.trim();
  if (note.length < 8) {
    window.alert("Please write at least 8 characters. It is saved in the audit log.");
    return null;
  }
  return note;
}

export function SupervisionPanel() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const token = session?.token;

  const queue = useQuery({
    queryKey: ["admin-supervision"],
    queryFn: () => workspaceRequest<SupervisionResponse>("/api/admin/supervision", token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });
  const sos = useQuery({
    queryKey: ["admin-sos"],
    queryFn: () => workspaceRequest<{ ok: boolean; sos: SosRow[] }>("/api/admin/sos?status=open", token),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
  const deletions = useQuery({
    queryKey: ["admin-deletions"],
    queryFn: () => workspaceRequest<DeletionRow[] | { requests?: DeletionRow[] }>("/api/admin/deletion-requests", token),
    enabled: Boolean(token),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-supervision"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sos"] });
    queryClient.invalidateQueries({ queryKey: ["admin-deletions"] });
  };

  const sosAction = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      workspaceRequest(`/api/admin/sos/${id}`, token, { method: "PATCH", body: JSON.stringify({ status, note }) }),
    onSuccess: refreshAll,
  });
  const deletionAction = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      workspaceRequest(`/api/admin/deletion-requests/${id}`, token, { method: "PATCH", body: JSON.stringify({ status, note }) }),
    onSuccess: refreshAll,
  });

  const queueItems = (queue.data?.queue || []).filter((item) => item.count > 0);
  const sosRows = sos.data?.sos || [];
  const deletionRows = (Array.isArray(deletions.data) ? deletions.data : deletions.data?.requests || [])
    .filter((row) => !["completed", "rejected"].includes(String(row.status || "").toLowerCase()));
  const actionError = (sosAction.error || deletionAction.error) as Error | null;

  return (
    <>
      <DashboardPanel
        title="Needs your attention"
        detail={queue.data ? `${queue.data.totalNeedingAttention} item(s) waiting on Legal Connect${queue.data.suspendedAccounts ? ` · ${queue.data.suspendedAccounts} suspended account(s)` : ""}` : "Everything waiting on LC review or action"}
      >
        {queue.isError ? (
          <p className="lc-sync-error"><AlertTriangle /> Supervision queue could not load.</p>
        ) : queueItems.length ? (
          queueItems.map((item) => (
            <Link className="lc-data-row" key={item.key} href={item.href}>
              <span className="lc-data-icon"><ShieldAlert /></span>
              <div><strong>{item.label}</strong></div>
              <StatusPill tone={item.count > 5 ? "danger" : "warning"}>{item.count}</StatusPill>
            </Link>
          ))
        ) : (
          <EmptyState icon={CheckCircle2} title="Nothing waiting" description={queue.isLoading ? "Checking..." : "No reviews, assignments or requests are pending."} />
        )}
      </DashboardPanel>

      <DashboardPanel title="Legal SOS" detail="Open emergency requests. Acknowledge fast; resolve only after help is arranged.">
        {sosRows.length ? sosRows.map((row) => (
          <div className="lc-data-row" key={row.id}>
            <span className="lc-data-icon"><LifeBuoy /></span>
            <div>
              <strong>{row.requester_name || "Client"} · {row.service_type || "Legal SOS"}</strong>
              <small>{[row.urgency, row.requester_phone, row.requester_email, when(row.created_at)].filter(Boolean).join(" · ")}</small>
            </div>
            <StatusPill tone={String(row.status || "").toLowerCase() === "acknowledged" ? "warning" : "danger"}>{row.status || "open"}</StatusPill>
            <div className="lc-hero-button-row">
              {!["acknowledged", "in_progress"].includes(String(row.status || "").toLowerCase()) && (
                <button className="lc-button" type="button" disabled={sosAction.isPending} onClick={() => sosAction.mutate({ id: row.id, status: "acknowledged" })}>Acknowledge</button>
              )}
              <button
                className="lc-button lc-button-primary"
                type="button"
                disabled={sosAction.isPending}
                onClick={() => {
                  const note = askNote("What was done for this SOS? (saved in the audit log)");
                  if (note) sosAction.mutate({ id: row.id, status: "resolved", note });
                }}
              >
                Resolve
              </button>
            </div>
          </div>
        )) : (
          <EmptyState icon={LifeBuoy} title="No open SOS" description={sos.isLoading ? "Checking..." : "New SOS requests appear here and notify admins."} />
        )}
      </DashboardPanel>

      <DashboardPanel title="Account deletion requests" detail="Delete data per the retention plan, then mark done. Refusals need a reason.">
        {deletionRows.length ? deletionRows.map((row) => (
          <div className="lc-data-row" key={row.id}>
            <span className="lc-data-icon"><UserX /></span>
            <div>
              <strong>{row.userName || row.name || "User"}</strong>
              <small>{[row.userEmail || row.emailMasked, when(row.requestedAt || row.requested_at || row.createdAt)].filter(Boolean).join(" · ")}</small>
            </div>
            <StatusPill tone="warning">{row.status || "pending"}</StatusPill>
            <div className="lc-hero-button-row">
              {String(row.status || "").toLowerCase() !== "in_review" && (
                <button className="lc-button" type="button" disabled={deletionAction.isPending} onClick={() => deletionAction.mutate({ id: row.id, status: "in_review" })}>Review</button>
              )}
              <button
                className="lc-button lc-button-primary"
                type="button"
                disabled={deletionAction.isPending}
                onClick={() => {
                  const note = askNote("Confirm what was deleted (saved in the audit log)");
                  if (note) deletionAction.mutate({ id: row.id, status: "completed", note });
                }}
              >
                Done
              </button>
              <button
                className="lc-button"
                type="button"
                disabled={deletionAction.isPending}
                onClick={() => {
                  const note = askNote("Why can't this request be completed? (sent to the user)");
                  if (note) deletionAction.mutate({ id: row.id, status: "rejected", note });
                }}
              >
                Refuse
              </button>
            </div>
          </div>
        )) : (
          <EmptyState icon={UserX} title="No pending deletion requests" description={deletions.isLoading ? "Checking..." : "Requests from Settings → Delete account appear here."} />
        )}
        {actionError && <p className="lc-sync-error"><AlertTriangle /> {actionError.message}</p>}
      </DashboardPanel>
    </>
  );
}
