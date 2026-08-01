import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileWarning,
  Gavel,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  ShieldCheck,
  TriangleAlert,
  UserRoundSearch,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";

type Advocate = {
  id: string;
  name: string;
  enrollmentNo?: string | null;
  verificationStatus?: string | null;
};

type Intake = {
  id: string;
  clientName?: string;
  legalIssueType?: string;
  serviceType?: string;
  paymentStatus?: string;
  status?: string;
  amount?: number;
  assignedAdvocateId?: string;
  assignedAdvocateName?: string;
  stageStatus?: string;
  intakeStatus?: string;
  missingDocuments?: string[];
  lastLcNote?: string | null;
  rejectionReason?: string | null;
  workHoldStatus?: string;
  createdAt?: string;
  sla?: {
    elapsedLabel?: string;
    remainingLabel?: string;
    breached?: boolean;
    windowHours?: number;
  } | null;
  pipeline?: {
    stageLabel?: string;
    stageOrder?: number;
    totalStages?: number;
  } | null;
};

type IntakesResponse = {
  ok: boolean;
  intakes: Intake[];
  advocates: Advocate[];
};

type DeskTask = {
  id: string;
  title?: string;
  status?: string;
  amount?: number;
  fee?: number;
  escrowStatus?: string;
  proofStatus?: string;
  assignedProxyName?: string;
  court?: string;
};

function needsSupervision(item: Intake) {
  const status = String(item.intakeStatus || item.stageStatus || item.paymentStatus || item.status || "").toLowerCase();
  if (status.includes("refund") || status.includes("rejected") || status.includes("concluded") || status === "closed") return false;
  if (item.assignedAdvocateId && ["advocate_assigned", "assigned", "advocate_accepted", "work_in_progress"].includes(status)) {
    return status === "advocate_assigned"; // still needs advocate accept visibility via desk
  }
  return true;
}

export function AdminControlDesk() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [advocateByIntake, setAdvocateByIntake] = useState<Record<string, string>>({});
  const [assignNotes, setAssignNotes] = useState<Record<string, string>>({});
  const [docRequests, setDocRequests] = useState<Record<string, string>>({});
  const [infoNotes, setInfoNotes] = useState<Record<string, string>>({});
  const [guidanceNotes, setGuidanceNotes] = useState<Record<string, string>>({});
  const [refundReasons, setRefundReasons] = useState<Record<string, string>>({});
  const [proxyByTask, setProxyByTask] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<string>("");

  const intakesQuery = useQuery({
    queryKey: ["admin-intakes"],
    queryFn: () => workspaceRequest<IntakesResponse>("/api/admin/intakes", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 8_000,
  });

  const controlDesk = useQuery({
    queryKey: ["admin-control-desk-tasks"],
    queryFn: () => workspaceRequest<{ tasks: DeskTask[]; advocates: Advocate[] }>("/api/admin/control-desk", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 8_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-intakes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-control-desk-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["admin-control-desk"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  const runIntake = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body: Record<string, unknown> }) =>
      workspaceRequest(`/api/admin/intakes/${id}/${action}`, session?.token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      const labels: Record<string, string> = {
        assign: "Panel lawyer assigned (advocate_assigned).",
        "request-info": "Document / info request sent to client.",
        guidance: "Official LC guidance published.",
        refund: "Intake rejected and escrow refund released.",
        "start-review": "Intake marked lc_under_review.",
        conclude: "Intake concluded — escrow released, rating unlocked.",
      };
      setSuccess(labels[variables.action] || "Intake action saved.");
      setError("");
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Intake action failed."),
  });

  const taskAction = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      workspaceRequest("/api/admin/task-action", session?.token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSuccess("Task / escrow action saved.");
      setError("");
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Task action failed."),
  });

  const assignProxy = useMutation({
    mutationFn: ({ taskId, advocateId, advocateName }: { taskId: string; advocateId: string; advocateName: string }) =>
      workspaceRequest(`/api/tasks/${taskId}/accept`, session?.token, {
        method: "POST",
        body: JSON.stringify({ proxyAdvocateId: advocateId, proxyAdvocateName: advocateName }),
      }),
    onSuccess: () => {
      setSuccess("Proxy counsel assigned.");
      setError("");
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Proxy assignment failed."),
  });

  const intakes = intakesQuery.data?.intakes || [];
  const advocates = intakesQuery.data?.advocates || controlDesk.data?.advocates || [];
  const queue = useMemo(() => intakes.filter(needsSupervision), [intakes]);
  const tasks = (controlDesk.data?.tasks || []).filter((task) => {
    const status = String(task.status || "").toLowerCase();
    return status.includes("awaiting")
      || status === "pending_admin_review"
      || status === "query_raised"
      || status === "open"
      || status.includes("proof")
      || task.proofStatus === "submitted"
      || (task.proofStatus === "approved" && String(task.escrowStatus || "").toLowerCase() !== "released");
  });

  if (intakesQuery.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening Intake Supervision Deck...</p></div>;
  }

  if (intakesQuery.isError) {
    return (
      <section className="lc-workspace-error">
        <TriangleAlert />
        <div>
          <h2>Intake desk unavailable</h2>
          <p>{intakesQuery.error.message}</p>
        </div>
        <button className="lc-button lc-button-primary" onClick={() => intakesQuery.refetch()}><RefreshCw /> Retry</button>
      </section>
    );
  }

  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">ADMIN MASTER SUPERVISION</span>
          <h2>Intake Supervision Deck</h2>
          <p>
            Four LC actions per intake: assign panel lawyer, request missing documents, send official guidance, or reject with escrow refund.
          </p>
        </div>
        <button className="lc-button" onClick={() => intakesQuery.refetch()} disabled={intakesQuery.isFetching}>
          {intakesQuery.isFetching ? <Loader2 className="lc-spin" /> : <RefreshCw />} Refresh
        </button>
      </section>

      <section className="lc-workspace-metrics" aria-label="Intake metrics">
        <div><Gavel /><span><strong>{queue.length}</strong><small>Intakes needing action</small></span></div>
        <div><UserRoundSearch /><span><strong>{advocates.length}</strong><small>Bar-verified panel</small></span></div>
        <div><BriefcaseBusiness /><span><strong>{tasks.length}</strong><small>Proxy / escrow actions</small></span></div>
        <div><ShieldCheck /><span><strong>{intakes.filter((item) => item.assignedAdvocateId).length}</strong><small>Assigned intakes</small></span></div>
      </section>

      <ActivityAuditTimeline
        title="Control Room · Live Status Broadcast"
        emptyText="New intakes, lawyer assignments, proxy accepts and escrow releases will stream here instantly."
        limit={20}
      />

      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}
      {success ? (
        <div role="status" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", color: "#027a48" }}>
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      ) : null}

      <p style={{ marginBottom: "1rem" }}>
        Counsel-authored case updates still go through{" "}
        <Link href="/admin/pending-updates">LC review</Link>
        {" "}before the client can see them.
      </p>

      <section className="space-y-4">
        <h3>Paid / pending intakes</h3>
        {!queue.length ? <p className="text-muted-foreground">Intake queue is clear.</p> : null}
        {queue.map((intake) => {
          const open = expanded === intake.id;
          const selectedAdvocate = advocates.find((item) => item.id === advocateByIntake[intake.id]);
          return (
            <article key={intake.id} style={{ padding: "1rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => setExpanded(open ? "" : intake.id)}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <strong>{intake.clientName || "Client intake"}</strong>
                    <p style={{ margin: "0.25rem 0", opacity: 0.75 }}>
                      {intake.legalIssueType || intake.serviceType || "Counsel request"}
                      {" · "}
                      {intake.pipeline?.stageLabel || intake.intakeStatus || intake.stageStatus || intake.paymentStatus || intake.status || "Pending"}
                      {intake.pipeline?.stageOrder ? ` · Stage ${intake.pipeline.stageOrder}/${intake.pipeline.totalStages || 7}` : ""}
                      {intake.amount != null ? ` · ₹${Number(intake.amount).toLocaleString("en-IN")}` : ""}
                    </p>
                    {intake.sla ? (
                      <p style={{ margin: "0.2rem 0 0", fontSize: 12, fontWeight: 700, color: intake.sla.breached ? "#b42318" : "#765a20" }}>
                        {intake.sla.breached ? "SLA breached · " : "SLA · "}
                        Received {intake.sla.elapsedLabel || "—"} ago
                        {intake.sla.remainingLabel ? ` · ${intake.sla.remainingLabel}` : ""}
                      </p>
                    ) : null}
                    {intake.assignedAdvocateName ? (
                      <p style={{ margin: 0, fontSize: 13 }}>Counsel: {intake.assignedAdvocateName}</p>
                    ) : null}
                    {intake.lastLcNote ? (
                      <p style={{ margin: "0.35rem 0 0", fontSize: 13, opacity: 0.8 }}>Last LC note: {intake.lastLcNote}</p>
                    ) : null}
                  </div>
                  <Scale className="h-5 w-5 opacity-50" />
                </div>
              </button>

              {open ? (
                <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
                  <div style={{ padding: "0.85rem", borderRadius: 10, background: "rgba(0,0,0,0.03)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className="lc-button"
                      disabled={runIntake.isPending}
                      onClick={() => runIntake.mutate({ id: intake.id, action: "start-review", body: {} })}
                    >
                      Mark lc_under_review
                    </button>
                    <button
                      className="lc-button"
                      disabled={runIntake.isPending}
                      onClick={() => runIntake.mutate({
                        id: intake.id,
                        action: "conclude",
                        body: { note: "Matter concluded after LC-supervised engagement." },
                      })}
                    >
                      Conclude / close
                    </button>
                  </div>
                  {/* Action 1 */}
                  <div style={{ padding: "0.85rem", borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
                    <h4 style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <UserRoundSearch className="h-4 w-4" /> Action 1 · Assign panel lawyer
                    </h4>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <select
                        value={advocateByIntake[intake.id] || ""}
                        onChange={(event) => setAdvocateByIntake((current) => ({ ...current, [intake.id]: event.target.value }))}
                        style={{ minWidth: 220, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      >
                        <option value="">Select Bar-verified lawyer</option>
                        {advocates.map((advocate) => (
                          <option key={advocate.id} value={advocate.id}>
                            {advocate.name}{advocate.enrollmentNo ? ` · ${advocate.enrollmentNo}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        value={assignNotes[intake.id] || ""}
                        onChange={(event) => setAssignNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                        placeholder="Optional assignment note"
                        style={{ flex: 1, minWidth: 180, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      />
                      <button
                        className="lc-button lc-button-primary"
                        disabled={runIntake.isPending || !advocateByIntake[intake.id]}
                        onClick={() => runIntake.mutate({
                          id: intake.id,
                          action: "assign",
                          body: {
                            advocateId: advocateByIntake[intake.id],
                            advocateName: selectedAdvocate?.name,
                            note: assignNotes[intake.id],
                          },
                        })}
                      >
                        {runIntake.isPending ? <Loader2 className="lc-spin" /> : <Gavel />} Assign
                      </button>
                    </div>
                  </div>

                  {/* Action 2 */}
                  <div style={{ padding: "0.85rem", borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
                    <h4 style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <FileWarning className="h-4 w-4" /> Action 2 · Request missing documents / LC update
                    </h4>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      <input
                        value={docRequests[intake.id] || ""}
                        onChange={(event) => setDocRequests((current) => ({ ...current, [intake.id]: event.target.value }))}
                        placeholder="Missing docs (comma-separated) e.g. Sale Deed, Aadhaar"
                        style={{ padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      />
                      <textarea
                        value={infoNotes[intake.id] || ""}
                        onChange={(event) => setInfoNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                        placeholder="Direct LC status note to the client"
                        rows={3}
                        style={{ padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      />
                      <button
                        className="lc-button lc-button-primary"
                        style={{ width: "fit-content" }}
                        disabled={runIntake.isPending}
                        onClick={() => runIntake.mutate({
                          id: intake.id,
                          action: "request-info",
                          body: {
                            missingDocuments: (docRequests[intake.id] || "").split(",").map((item) => item.trim()).filter(Boolean),
                            message: infoNotes[intake.id],
                          },
                        })}
                      >
                        <Send /> Send request
                      </button>
                    </div>
                  </div>

                  {/* Action 3 */}
                  <div style={{ padding: "0.85rem", borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
                    <h4 style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <MessageSquareText className="h-4 w-4" /> Action 3 · Official LC guidance note
                    </h4>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      <textarea
                        value={guidanceNotes[intake.id] || ""}
                        onChange={(event) => setGuidanceNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                        placeholder="Official Legal Connect legal advice / guidance note"
                        rows={3}
                        style={{ padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      />
                      <button
                        className="lc-button lc-button-primary"
                        style={{ width: "fit-content" }}
                        disabled={runIntake.isPending || !(guidanceNotes[intake.id] || "").trim()}
                        onClick={() => runIntake.mutate({
                          id: intake.id,
                          action: "guidance",
                          body: { guidance: guidanceNotes[intake.id], sendSms: true },
                        })}
                      >
                        <ShieldCheck /> Issue guidance
                      </button>
                    </div>
                  </div>

                  {/* Action 4 */}
                  <div style={{ padding: "0.85rem", borderRadius: 10, background: "rgba(180,35,24,0.06)" }}>
                    <h4 style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <RotateCcw className="h-4 w-4" /> Action 4 · Reject intake & escrow refund
                    </h4>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <input
                        value={refundReasons[intake.id] || ""}
                        onChange={(event) => setRefundReasons((current) => ({ ...current, [intake.id]: event.target.value }))}
                        placeholder="Rejection reason (required)"
                        style={{ flex: 1, minWidth: 220, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      />
                      <button
                        className="lc-button"
                        disabled={runIntake.isPending || !(refundReasons[intake.id] || "").trim()}
                        onClick={() => {
                          if (!window.confirm("Reject this intake and release the work hold / refund?")) return;
                          runIntake.mutate({
                            id: intake.id,
                            action: "refund",
                            body: { reason: refundReasons[intake.id] },
                          });
                        }}
                      >
                        <Wallet /> Reject & refund
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem" }}>Proxy tasks & escrow control</h3>
        {!tasks.length ? <p className="text-muted-foreground">No proxy missions need admin action.</p> : null}
        <div className="space-y-3">
          {tasks.map((task) => {
            const pendingAssign = /awaiting|open/i.test(String(task.status || ""));
            const selected = advocates.find((item) => item.id === proxyByTask[task.id]);
            return (
              <article key={task.id} style={{ padding: "1rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12 }}>
                <strong>{task.title || "Proxy mission"}</strong>
                <p style={{ margin: "0.25rem 0", opacity: 0.75 }}>
                  {task.court || "Court TBD"} · {task.status}
                  {task.amount != null || task.fee != null ? ` · ₹${Number(task.amount ?? task.fee).toLocaleString("en-IN")}` : ""}
                  {" · "}Proof {task.proofStatus || "none"} · Escrow {task.escrowStatus || "—"}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.65rem" }}>
                  {pendingAssign ? (
                    <>
                      <select
                        value={proxyByTask[task.id] || ""}
                        onChange={(event) => setProxyByTask((current) => ({ ...current, [task.id]: event.target.value }))}
                        style={{ minWidth: 200, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border, #d0d5dd)" }}
                      >
                        <option value="">Select proxy counsel</option>
                        {advocates.map((advocate) => (
                          <option key={advocate.id} value={advocate.id}>{advocate.name}</option>
                        ))}
                      </select>
                      <button
                        className="lc-button lc-button-primary"
                        disabled={assignProxy.isPending || !proxyByTask[task.id]}
                        onClick={() => assignProxy.mutate({
                          taskId: String(task.id),
                          advocateId: proxyByTask[task.id],
                          advocateName: selected?.name || "Proxy counsel",
                        })}
                      >
                        Assign proxy
                      </button>
                    </>
                  ) : null}
                  {task.proofStatus === "submitted" ? (
                    <button
                      className="lc-button lc-button-primary"
                      disabled={taskAction.isPending}
                      onClick={() => taskAction.mutate({ taskId: task.id, action: "mark_proof_approved" })}
                    >
                      Approve proof
                    </button>
                  ) : null}
                  {task.proofStatus === "approved" && String(task.escrowStatus || "").toLowerCase() !== "released" ? (
                    <button
                      className="lc-button lc-button-primary"
                      disabled={taskAction.isPending}
                      onClick={() => taskAction.mutate({ taskId: task.id, action: "release_payment" })}
                    >
                      Release escrow
                    </button>
                  ) : null}
                  <Link className="lc-button" href="/admin/missions">Open missions</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
