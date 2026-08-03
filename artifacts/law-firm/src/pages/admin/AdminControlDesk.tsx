import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  FileWarning,
  Gavel,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
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
import { AdminPendingUpdates } from "@/pages/admin/AdminPendingUpdates";
import { AdminVerifications } from "@/pages/admin/AdminVerifications";

type Advocate = {
  id: string;
  name: string;
  enrollmentNo?: string | null;
  verificationStatus?: string | null;
  activeCasesCount?: number;
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
  clientName?: string;
};

type DeskCase = {
  id: string;
  title?: string;
  caseTitle?: string;
  caseNumber?: string;
  caseNo?: string;
  court?: string;
  courtName?: string;
  status?: string;
  assignedAdvocateId?: string;
  assignedAdvocateName?: string;
  assignedTo?: string;
  clientName?: string;
  bookingId?: string;
  nextDate?: string;
};

type DeskBooking = {
  id: string;
  clientName?: string;
  legalIssueType?: string;
  serviceType?: string;
  amount?: number;
  paymentStatus?: string;
  workHoldStatus?: string;
  stageStatus?: string;
  intakeStatus?: string;
  assignedAdvocateName?: string;
  receiptNo?: string;
};

type ControlDeskResponse = {
  ok?: boolean;
  tasks: DeskTask[];
  advocates: Advocate[];
  cases?: DeskCase[];
  bookings?: DeskBooking[];
  pendingUpdates?: unknown[];
  pendingReplies?: unknown[];
};

type OpsTab = "intakes" | "proxy" | "moderation" | "verifications" | "escrow" | "cases";
type QuickFilter =
  | "all"
  | "unassigned"
  | "needs_lc"
  | "active_proxy"
  | "pending_verify"
  | "escrow_holds";

function needsSupervision(item: Intake) {
  const status = String(item.intakeStatus || item.stageStatus || item.paymentStatus || item.status || "").toLowerCase();
  if (status.includes("refund") || status.includes("rejected") || status.includes("concluded") || status === "closed") return false;
  if (item.assignedAdvocateId && ["advocate_assigned", "assigned", "advocate_accepted", "work_in_progress"].includes(status)) {
    return status === "advocate_assigned";
  }
  return true;
}

function isProxyActionable(task: DeskTask) {
  const status = String(task.status || "").toLowerCase();
  return status.includes("awaiting")
    || status === "pending_admin_review"
    || status === "query_raised"
    || status === "open"
    || status.includes("proof")
    || task.proofStatus === "submitted"
    || (task.proofStatus === "approved" && String(task.escrowStatus || "").toLowerCase() !== "released");
}

function isEscrowHeld(task: DeskTask) {
  const escrow = String(task.escrowStatus || "").toLowerCase();
  return escrow.includes("lock") || escrow.includes("hold") || (escrow && !escrow.includes("release") && !escrow.includes("not"));
}

function matchesQuery(haystack: Array<string | null | undefined>, query: string) {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return haystack.some((value) => String(value || "").toLowerCase().includes(needle));
}

function advocateOptionLabel(advocate: Advocate) {
  const count = Number(advocate.activeCasesCount || 0);
  const workload = `${count} active case${count === 1 ? "" : "s"}`;
  const enrollment = advocate.enrollmentNo ? ` · ${advocate.enrollmentNo}` : "";
  const verified = /approved|verified/i.test(String(advocate.verificationStatus || ""))
    ? " · Verified"
    : advocate.verificationStatus
      ? ` · ${advocate.verificationStatus}`
      : "";
  return `${advocate.name} (${workload})${enrollment}${verified}`;
}

export function AdminControlDesk() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OpsTab>("intakes");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [advocateByIntake, setAdvocateByIntake] = useState<Record<string, string>>({});
  const [advocateByCase, setAdvocateByCase] = useState<Record<string, string>>({});
  const [assignNotes, setAssignNotes] = useState<Record<string, string>>({});
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
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
    queryFn: () => workspaceRequest<ControlDeskResponse>("/api/admin/control-desk", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 8_000,
  });

  const verificationsQuery = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: () => workspaceRequest<{ verifications: Array<{ status?: string }> }>("/api/admin/verifications", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-intakes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-control-desk-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["admin-control-desk"] });
    queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-updates"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
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
        refund: "Intake rejected — work hold released. Refund (if any) is manual; not an automated Razorpay refund.",
        "start-review": "Intake marked lc_under_review.",
        conclude: "Intake concluded — work hold released for manual settlement.",
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
      setSuccess("Task / work-hold action saved.");
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

  const assignCase = useMutation({
    mutationFn: ({ caseId, advocateId, note }: { caseId: string; advocateId: string; note?: string }) =>
      workspaceRequest(`/api/admin/cases/${caseId}/assign`, session?.token, {
        method: "POST",
        body: JSON.stringify({ advocateId, note }),
      }),
    onSuccess: () => {
      setSuccess("Case assigned to panel advocate.");
      setError("");
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Case assignment failed."),
  });

  const intakes = intakesQuery.data?.intakes || [];
  const advocates = useMemo(() => {
    const fromIntakes = intakesQuery.data?.advocates || [];
    const fromDesk = controlDesk.data?.advocates || [];
    const map = new Map<string, Advocate>();
    [...fromDesk, ...fromIntakes].forEach((advocate) => {
      if (!advocate?.id) return;
      map.set(advocate.id, { ...map.get(advocate.id), ...advocate });
    });
    return Array.from(map.values()).sort((a, b) => Number(a.activeCasesCount || 0) - Number(b.activeCasesCount || 0));
  }, [intakesQuery.data?.advocates, controlDesk.data?.advocates]);

  const queue = useMemo(() => intakes.filter(needsSupervision), [intakes]);
  const tasks = useMemo(
    () => (controlDesk.data?.tasks || []).filter(isProxyActionable),
    [controlDesk.data?.tasks],
  );
  const allTasks = controlDesk.data?.tasks || [];
  const cases = controlDesk.data?.cases || [];
  const bookings = controlDesk.data?.bookings || [];
  const pendingLcCount = (controlDesk.data?.pendingUpdates || []).length + (controlDesk.data?.pendingReplies || []).length;
  const pendingVerifyCount = (verificationsQuery.data?.verifications || []).filter((item) => item.status === "pending").length;
  const escrowTasks = allTasks.filter(isEscrowHeld);
  const heldBookings = bookings.filter((item) => {
    const hold = String(item.workHoldStatus || "").toLowerCase();
    return hold.includes("hold") || hold.includes("lock") || hold === "active";
  });

  const filteredIntakes = useMemo(() => {
    let rows = queue;
    if (filter === "unassigned") rows = rows.filter((item) => !item.assignedAdvocateId);
    if (filter === "needs_lc") {
      rows = rows.filter((item) => {
        const status = String(item.intakeStatus || item.stageStatus || "").toLowerCase();
        return status.includes("review") || status.includes("lc_") || !item.assignedAdvocateId;
      });
    }
    return rows.filter((item) => matchesQuery([
      item.clientName,
      item.legalIssueType,
      item.serviceType,
      item.assignedAdvocateName,
      item.id,
      item.intakeStatus,
      item.stageStatus,
    ], search));
  }, [queue, filter, search]);

  const filteredTasks = useMemo(() => {
    let rows = filter === "active_proxy" || filter === "escrow_holds"
      ? (filter === "escrow_holds" ? escrowTasks : tasks)
      : tasks;
    if (filter === "escrow_holds") rows = escrowTasks;
    return rows.filter((task) => matchesQuery([
      task.title,
      task.court,
      task.status,
      task.assignedProxyName,
      task.clientName,
      task.id,
    ], search));
  }, [tasks, escrowTasks, filter, search]);

  const filteredCases = useMemo(() => {
    let rows = cases;
    if (filter === "unassigned") {
      rows = rows.filter((item) => !item.assignedAdvocateId && !item.assignedTo && !item.assignedAdvocateName);
    }
    return rows.filter((item) => matchesQuery([
      item.caseTitle,
      item.title,
      item.caseNumber,
      item.caseNo,
      item.court,
      item.courtName,
      item.clientName,
      item.assignedAdvocateName,
      item.id,
      item.status,
    ], search));
  }, [cases, filter, search]);

  const filteredEscrowBookings = useMemo(() => heldBookings.filter((item) => matchesQuery([
    item.clientName,
    item.legalIssueType,
    item.serviceType,
    item.assignedAdvocateName,
    item.receiptNo,
    item.id,
    item.workHoldStatus,
  ], search)), [heldBookings, search]);

  const applyFilter = (next: QuickFilter) => {
    setFilter(next);
    if (next === "active_proxy") setTab("proxy");
    if (next === "needs_lc") setTab("moderation");
    if (next === "pending_verify") setTab("verifications");
    if (next === "escrow_holds") setTab("escrow");
    if (next === "unassigned") setTab("intakes");
    if (next === "all") setTab("intakes");
  };

  if (intakesQuery.isLoading && controlDesk.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening Ops Command...</p></div>;
  }

  if (intakesQuery.isError && controlDesk.isError) {
    return (
      <section className="lc-workspace-error">
        <TriangleAlert />
        <div>
          <h2>Ops Command unavailable</h2>
          <p>{intakesQuery.error.message}</p>
        </div>
        <button className="lc-button lc-button-primary" onClick={() => { intakesQuery.refetch(); controlDesk.refetch(); }}>
          <RefreshCw /> Retry
        </button>
      </section>
    );
  }

  const tabs: Array<{ id: OpsTab; label: string; count?: number }> = [
    { id: "intakes", label: "Intakes & Assignments", count: queue.length },
    { id: "proxy", label: "Proxy Missions", count: tasks.length },
    { id: "moderation", label: "Counsel Updates", count: pendingLcCount },
    { id: "verifications", label: "Credential Verifications", count: pendingVerifyCount },
    { id: "escrow", label: "Escrow & Revenue", count: escrowTasks.length + heldBookings.length },
    { id: "cases", label: "Global Case Register", count: cases.length },
  ];

  const pills: Array<{ id: QuickFilter; label: string; count?: number }> = [
    { id: "all", label: "All ops" },
    { id: "unassigned", label: "Unassigned", count: queue.filter((item) => !item.assignedAdvocateId).length },
    { id: "needs_lc", label: "Needs LC Review", count: pendingLcCount || queue.filter((item) => String(item.intakeStatus || "").includes("review")).length },
    { id: "active_proxy", label: "Active Proxy Tasks", count: tasks.length },
    { id: "pending_verify", label: "Pending Verify", count: pendingVerifyCount },
    { id: "escrow_holds", label: "Escrow Holds", count: escrowTasks.length + heldBookings.length },
  ];

  return (
    <div className="lc-workspace-page lc-ops-command">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">360° OPERATIONS COMMAND</span>
          <h2>Admin Ops Desk</h2>
          <p>
            Assign cases to verified advocates by live workload, moderate counsel updates, verify credentials,
            and control escrow — from one command surface.
          </p>
        </div>
        <button
          className="lc-button"
          onClick={() => { intakesQuery.refetch(); controlDesk.refetch(); verificationsQuery.refetch(); }}
          disabled={intakesQuery.isFetching || controlDesk.isFetching}
        >
          {(intakesQuery.isFetching || controlDesk.isFetching) ? <Loader2 className="lc-spin" /> : <RefreshCw />} Refresh
        </button>
      </section>

      <section className="lc-workspace-metrics" aria-label="Ops metrics">
        <div><Gavel /><span><strong>{queue.length}</strong><small>Intakes needing action</small></span></div>
        <div><UserRoundSearch /><span><strong>{advocates.length}</strong><small>Bar-verified panel</small></span></div>
        <div><BriefcaseBusiness /><span><strong>{tasks.length}</strong><small>Proxy / work-hold actions</small></span></div>
        <div><ShieldCheck /><span><strong>{pendingVerifyCount}</strong><small>Pending verifications</small></span></div>
      </section>

      <div className="lc-ops-toolbar">
        <label className="lc-ops-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients, advocates, courts, case IDs, issue types…"
            aria-label="Global ops search"
          />
        </label>
        <div className="lc-ops-pills" role="list" aria-label="Quick status filters">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              role="listitem"
              className={filter === pill.id ? "is-active" : undefined}
              onClick={() => applyFilter(pill.id)}
            >
              {pill.label}
              {pill.count != null ? <em>{pill.count}</em> : null}
            </button>
          ))}
        </div>
      </div>

      <nav className="lc-ops-tabs" aria-label="Ops command tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "is-active" : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.count != null ? <em>{item.count}</em> : null}
          </button>
        ))}
      </nav>

      <ActivityAuditTimeline
        title="Control Room · Live Status Broadcast"
        emptyText="New intakes, lawyer assignments, proxy accepts and work-hold releases will stream here instantly."
        limit={20}
      />

      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}
      {success ? (
        <div role="status" className="lc-ops-success">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      ) : null}

      {tab === "intakes" ? (
        <section className="space-y-4">
          <h3>Intakes & Assignments</h3>
          {!filteredIntakes.length ? <p className="text-muted-foreground">No intakes match this view.</p> : null}
          {filteredIntakes.map((intake) => {
            const open = expanded === intake.id;
            const selectedAdvocate = advocates.find((item) => item.id === advocateByIntake[intake.id]);
            return (
              <article key={intake.id} className="lc-ops-card">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? "" : intake.id)}
                  className="lc-ops-card-toggle"
                >
                  <div className="lc-ops-card-head">
                    <div>
                      <strong>{intake.clientName || "Client intake"}</strong>
                      <p>
                        {intake.legalIssueType || intake.serviceType || "Counsel request"}
                        {" · "}
                        {intake.pipeline?.stageLabel || intake.intakeStatus || intake.stageStatus || intake.paymentStatus || intake.status || "Pending"}
                        {intake.pipeline?.stageOrder ? ` · Stage ${intake.pipeline.stageOrder}/${intake.pipeline.totalStages || 7}` : ""}
                        {intake.amount != null ? ` · ₹${Number(intake.amount).toLocaleString("en-IN")}` : ""}
                      </p>
                      {intake.sla ? (
                        <p className={intake.sla.breached ? "lc-ops-sla breached" : "lc-ops-sla"}>
                          {intake.sla.breached ? "SLA breached · " : "SLA · "}
                          Received {intake.sla.elapsedLabel || "—"} ago
                          {intake.sla.remainingLabel ? ` · ${intake.sla.remainingLabel}` : ""}
                        </p>
                      ) : null}
                      {intake.assignedAdvocateName ? (
                        <p className="lc-ops-meta">Counsel: {intake.assignedAdvocateName}</p>
                      ) : (
                        <p className="lc-ops-meta warn">Unassigned — select advocate by live workload</p>
                      )}
                      {intake.lastLcNote ? <p className="lc-ops-meta">Last LC note: {intake.lastLcNote}</p> : null}
                    </div>
                    <Scale className="h-5 w-5 opacity-50" />
                  </div>
                </button>

                {open ? (
                  <div className="lc-ops-actions">
                    <div className="lc-ops-action-block row">
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

                    <div className="lc-ops-action-block">
                      <h4><UserRoundSearch className="h-4 w-4" /> Assign case to advocate</h4>
                      <div className="lc-ops-inline">
                        <select
                          value={advocateByIntake[intake.id] || ""}
                          onChange={(event) => setAdvocateByIntake((current) => ({ ...current, [intake.id]: event.target.value }))}
                        >
                          <option value="">Select Bar-verified lawyer (lowest workload first)</option>
                          {advocates.map((advocate) => (
                            <option key={advocate.id} value={advocate.id}>
                              {advocateOptionLabel(advocate)}
                            </option>
                          ))}
                        </select>
                        <input
                          value={assignNotes[intake.id] || ""}
                          onChange={(event) => setAssignNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                          placeholder="Optional assignment note"
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

                    <div className="lc-ops-action-block">
                      <h4><FileWarning className="h-4 w-4" /> Request missing documents / LC update</h4>
                      <div className="lc-ops-stack">
                        <input
                          value={docRequests[intake.id] || ""}
                          onChange={(event) => setDocRequests((current) => ({ ...current, [intake.id]: event.target.value }))}
                          placeholder="Missing docs (comma-separated) e.g. Sale Deed, Aadhaar"
                        />
                        <textarea
                          value={infoNotes[intake.id] || ""}
                          onChange={(event) => setInfoNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                          placeholder="Direct LC status note to the client"
                          rows={3}
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

                    <div className="lc-ops-action-block">
                      <h4><MessageSquareText className="h-4 w-4" /> Official LC guidance note</h4>
                      <div className="lc-ops-stack">
                        <textarea
                          value={guidanceNotes[intake.id] || ""}
                          onChange={(event) => setGuidanceNotes((current) => ({ ...current, [intake.id]: event.target.value }))}
                          placeholder="Official Legal Connect legal advice / guidance note"
                          rows={3}
                        />
                        <button
                          className="lc-button lc-button-primary"
                          style={{ width: "fit-content" }}
                          disabled={runIntake.isPending || !(guidanceNotes[intake.id] || "").trim()}
                          onClick={() => runIntake.mutate({
                            id: intake.id,
                            action: "guidance",
                            body: { guidance: guidanceNotes[intake.id], sendSms: false },
                          })}
                        >
                          <ShieldCheck /> Issue guidance
                        </button>
                      </div>
                    </div>

                    <div className="lc-ops-action-block danger">
                      <h4><RotateCcw className="h-4 w-4" /> Reject intake & release work hold</h4>
                      <p>
                        Releases the platform work hold and flags a manual refund for Admin/support. Does not call Razorpay refunds.
                      </p>
                      <div className="lc-ops-inline">
                        <input
                          value={refundReasons[intake.id] || ""}
                          onChange={(event) => setRefundReasons((current) => ({ ...current, [intake.id]: event.target.value }))}
                          placeholder="Rejection reason (required)"
                        />
                        <button
                          className="lc-button"
                          disabled={runIntake.isPending || !(refundReasons[intake.id] || "").trim()}
                          onClick={() => {
                            if (!window.confirm("Reject this intake and release the work hold? Any money refund stays manual (not automated Razorpay).")) return;
                            runIntake.mutate({
                              id: intake.id,
                              action: "refund",
                              body: { reason: refundReasons[intake.id] },
                            });
                          }}
                        >
                          <Wallet /> Reject & release hold
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "proxy" ? (
        <section>
          <h3>Proxy Missions</h3>
          {!filteredTasks.length ? <p className="text-muted-foreground">No proxy missions need admin action.</p> : null}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const pendingAssign = /awaiting|open/i.test(String(task.status || ""));
              const selected = advocates.find((item) => item.id === proxyByTask[task.id]);
              return (
                <article key={task.id} className="lc-ops-card">
                  <strong>{task.title || "Proxy mission"}</strong>
                  <p className="lc-ops-meta">
                    {task.court || "Court TBD"} · {task.status}
                    {task.amount != null || task.fee != null ? ` · ₹${Number(task.amount ?? task.fee).toLocaleString("en-IN")}` : ""}
                    {" · "}Proof {task.proofStatus || "none"} · Work hold {task.escrowStatus || "—"}
                  </p>
                  <div className="lc-ops-inline" style={{ marginTop: "0.65rem" }}>
                    {pendingAssign ? (
                      <>
                        <select
                          value={proxyByTask[task.id] || ""}
                          onChange={(event) => setProxyByTask((current) => ({ ...current, [task.id]: event.target.value }))}
                        >
                          <option value="">Select proxy counsel</option>
                          {advocates.map((advocate) => (
                            <option key={advocate.id} value={advocate.id}>{advocateOptionLabel(advocate)}</option>
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
                        onClick={() => {
                          if (!window.confirm("Release the work hold for manual settlement? This does not send an automated Razorpay payout.")) return;
                          taskAction.mutate({ taskId: task.id, action: "release_payment" });
                        }}
                      >
                        Release work hold
                      </button>
                    ) : null}
                    <Link className="lc-button" href="/admin/missions">Open missions</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "moderation" ? (
        <section>
          <h3>Counsel Updates Moderation Audit</h3>
          <p className="text-muted-foreground" style={{ marginBottom: "1rem" }}>
            Approve or return advocate updates and client replies before they reach the other party.
          </p>
          <AdminPendingUpdates embedded />
        </section>
      ) : null}

      {tab === "verifications" ? (
        <section>
          <h3>Credential Verifications</h3>
          <p className="text-muted-foreground" style={{ marginBottom: "1rem" }}>
            Review masked identity references. Raw Aadhaar values are never returned by this API.
          </p>
          <AdminVerifications embedded />
        </section>
      ) : null}

      {tab === "escrow" ? (
        <section className="space-y-4">
          <div className="lc-ops-section-head">
            <div>
              <h3>Escrow & Revenue Ledger</h3>
              <p className="text-muted-foreground">Work holds, proof gates, and settlement-ready ledger rows. Automated Razorpay payouts are not claimed here.</p>
            </div>
            <Link className="lc-button" href="/admin/revenue">Open revenue analytics</Link>
          </div>

          <div className="lc-workspace-metrics" aria-label="Escrow snapshot">
            <div><Wallet /><span><strong>{escrowTasks.length}</strong><small>Proxy holds</small></span></div>
            <div><BriefcaseBusiness /><span><strong>{heldBookings.length}</strong><small>Intake work holds</small></span></div>
            <div><CheckCircle2 /><span><strong>{allTasks.filter((task) => String(task.escrowStatus || "").toLowerCase().includes("release")).length}</strong><small>Released holds</small></span></div>
            <div><FileSearch /><span><strong>₹{[...escrowTasks, ...filteredEscrowBookings].reduce((sum, item) => sum + Number(("amount" in item ? item.amount : 0) || ("fee" in item ? item.fee : 0) || 0), 0).toLocaleString("en-IN")}</strong><small>Held notional value</small></span></div>
          </div>

          <h4>Proxy escrow rows</h4>
          {!filteredTasks.filter(isEscrowHeld).length && !escrowTasks.length ? (
            <p className="text-muted-foreground">No active proxy escrow holds.</p>
          ) : null}
          <div className="space-y-3">
            {(filter === "escrow_holds" ? filteredTasks : escrowTasks.filter((task) => matchesQuery([
              task.title, task.court, task.status, task.assignedProxyName, task.id,
            ], search))).map((task) => (
              <article key={task.id} className="lc-ops-card">
                <strong>{task.title || "Proxy mission"}</strong>
                <p className="lc-ops-meta">
                  Hold {task.escrowStatus || "—"} · Proof {task.proofStatus || "none"} · {task.court || "Court TBD"}
                  {task.amount != null || task.fee != null ? ` · ₹${Number(task.amount ?? task.fee).toLocaleString("en-IN")}` : ""}
                </p>
                <div className="lc-ops-inline" style={{ marginTop: "0.65rem" }}>
                  {task.proofStatus === "submitted" ? (
                    <button className="lc-button lc-button-primary" disabled={taskAction.isPending} onClick={() => taskAction.mutate({ taskId: task.id, action: "mark_proof_approved" })}>
                      Approve proof
                    </button>
                  ) : null}
                  {task.proofStatus === "approved" && String(task.escrowStatus || "").toLowerCase() !== "released" ? (
                    <button
                      className="lc-button lc-button-primary"
                      disabled={taskAction.isPending}
                      onClick={() => {
                        if (!window.confirm("Release the work hold for manual settlement?")) return;
                        taskAction.mutate({ taskId: task.id, action: "release_payment" });
                      }}
                    >
                      Release work hold
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <h4>Intake work holds</h4>
          {!filteredEscrowBookings.length ? <p className="text-muted-foreground">No intake work holds match this view.</p> : null}
          <div className="space-y-3">
            {filteredEscrowBookings.map((booking) => (
              <article key={booking.id} className="lc-ops-card">
                <strong>{booking.clientName || "Client booking"}</strong>
                <p className="lc-ops-meta">
                  {booking.legalIssueType || booking.serviceType || "Counsel"} · Hold {booking.workHoldStatus || "—"}
                  {booking.amount != null ? ` · ₹${Number(booking.amount).toLocaleString("en-IN")}` : ""}
                  {booking.assignedAdvocateName ? ` · ${booking.assignedAdvocateName}` : " · Unassigned"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "cases" ? (
        <section>
          <div className="lc-ops-section-head">
            <div>
              <h3>Global Case Register</h3>
              <p className="text-muted-foreground">Live matters across the platform. Assign unallocated cases with one click using workload-aware advocate ranking.</p>
            </div>
            <Link className="lc-button" href="/admin/cases">Open full cases list</Link>
          </div>
          {!filteredCases.length ? <p className="text-muted-foreground">No cases match this view.</p> : null}
          <div className="space-y-3">
            {filteredCases.map((matter) => {
              const selected = advocates.find((item) => item.id === advocateByCase[matter.id]);
              const alreadyAssigned = Boolean(matter.assignedAdvocateId || matter.assignedTo || matter.assignedAdvocateName);
              return (
                <article key={matter.id} className="lc-ops-card">
                  <strong>{matter.caseTitle || matter.title || "Untitled matter"}</strong>
                  <p className="lc-ops-meta">
                    {matter.caseNumber || matter.caseNo || "Number pending"} · {matter.courtName || matter.court || "Court not listed"}
                    {" · "}{matter.status || "Active"}
                    {matter.clientName ? ` · ${matter.clientName}` : ""}
                    {matter.assignedAdvocateName ? ` · Counsel: ${matter.assignedAdvocateName}` : " · Unassigned"}
                  </p>
                  {!alreadyAssigned ? (
                    <div className="lc-ops-inline" style={{ marginTop: "0.65rem" }}>
                      <select
                        value={advocateByCase[matter.id] || ""}
                        onChange={(event) => setAdvocateByCase((current) => ({ ...current, [matter.id]: event.target.value }))}
                      >
                        <option value="">Assign to advocate…</option>
                        {advocates.map((advocate) => (
                          <option key={advocate.id} value={advocate.id}>{advocateOptionLabel(advocate)}</option>
                        ))}
                      </select>
                      <input
                        value={caseNotes[matter.id] || ""}
                        onChange={(event) => setCaseNotes((current) => ({ ...current, [matter.id]: event.target.value }))}
                        placeholder="Optional note"
                      />
                      <button
                        className="lc-button lc-button-primary"
                        disabled={assignCase.isPending || !advocateByCase[matter.id]}
                        onClick={() => assignCase.mutate({
                          caseId: matter.id,
                          advocateId: advocateByCase[matter.id],
                          note: caseNotes[matter.id],
                        })}
                      >
                        {assignCase.isPending ? <Loader2 className="lc-spin" /> : <Gavel />} Assign {selected?.name ? `to ${selected.name.split(" ").slice(-1)[0]}` : ""}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
