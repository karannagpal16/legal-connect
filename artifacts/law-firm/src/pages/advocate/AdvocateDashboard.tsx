import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useListTasks } from "@workspace/api-client-react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HandCoins,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { dailyQuote, greetingFor, workspaceRequest, type WorkspaceCase } from "@/lib/workspace";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";
import { HeroActionBanner, pickHeroAction } from "@/components/dashboard/HeroActionBanner";
import { TaskDialog } from "@/components/forms/TaskDialog";

interface ChamberTask {
  id: string;
  title: string;
  assignee_name: string;
  status: string;
  priority: string;
  due_at?: string;
}

interface PaidIntake {
  id: string;
  clientName: string;
  legalIssueType: string;
  paymentStatus: string;
  createdAt: string;
  intakeStatus?: string;
  stageStatus?: string;
  assignedAdvocateId?: string;
}

interface AdvocateWorkspace {
  ok: boolean;
  profile: { name: string; enrollmentNo: string; stateBarCouncil: string; practiceCourts: string; verificationStatus: string };
  cases: WorkspaceCase[];
  paidIntakes: PaidIntake[];
  chamber: { id: string; name: string; members: unknown[]; tasks: ChamberTask[] } | null;
  dataMode: "live" | "sample";
}

type ProxyDeskTask = {
  id: string | number;
  title?: string;
  taskDescription?: string;
  status?: string;
  fee?: string | number | null;
  amount?: number | null;
  location?: string | null;
  court?: string | null;
  cnr?: string | null;
  hearingDate?: string | null;
  proofStatus?: string | null;
  createdAt?: string;
};

const caseStages = ["Intake Review", "Drafting", "Pleadings", "Evidence", "Arguments", "Order Reserved", "Disposed"];

function proxyStatusLabel(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value.includes("pending_admin") || value.includes("awaiting")) return "Awaiting LC assign";
  if (value.includes("query")) return "LC query raised";
  if (value === "open") return "Marketplace open";
  if (value.includes("assign") || value === "accepted") return "Proxy assigned";
  if (value.includes("proof")) return "Proof review";
  if (value.includes("completed") || value.includes("released") || value.includes("closed")) return "Completed";
  return status || "Posted";
}

export function AdvocateDashboard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [stageDrafts, setStageDrafts] = useState<Record<string, string>>({});
  const [postTaskOpen, setPostTaskOpen] = useState(false);
  const quote = dailyQuote();
  const query = useQuery({
    queryKey: ["advocate-workspace", session?.user.id],
    queryFn: () => workspaceRequest<AdvocateWorkspace>("/api/workspaces/advocate", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
  });
  const proxyQuery = useListTasks({
    query: {
      enabled: Boolean(session?.token),
      staleTime: 15_000,
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ caseId, stage }: { caseId: string; stage: string }) => workspaceRequest<{ ok: boolean; matter: WorkspaceCase; syncedAt: string }>(
      `/api/workspaces/advocate/cases/${caseId}/status`,
      session?.token,
      { method: "PATCH", body: JSON.stringify({ stage }) },
    ),
    onSuccess: (payload) => {
      queryClient.setQueryData<AdvocateWorkspace>(["advocate-workspace", session?.user.id], (current) => current ? {
        ...current,
        cases: current.cases.map((matter) => matter.id === payload.matter.id ? payload.matter : matter),
      } : current);
    },
  });
  const acceptIntake = useMutation({
    mutationFn: (intakeId: string) => workspaceRequest<{ ok: boolean }>(
      `/api/intakes/${intakeId}/advocate-accept`,
      session?.token,
      { method: "POST", body: JSON.stringify({ note: "Matter accepted. Work commencing under Legal Connect supervision." }) },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advocate-workspace", session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["platform-events"] });
    },
  });
  const activeCases = useMemo(() => query.data?.cases.filter((matter) => !["Disposed", "Closed"].includes(matter.status)) || [], [query.data]);
  const upcoming = activeCases.filter((matter) => matter.nextDate).length;
  const openTasks = query.data?.chamber?.tasks.filter((task) => task.status !== "completed") || [];
  const proxyTasks = useMemo(
    () => (Array.isArray(proxyQuery.data) ? proxyQuery.data : []) as ProxyDeskTask[],
    [proxyQuery.data],
  );
  const pendingProxy = proxyTasks.filter((task) => {
    const status = String(task.status || "").toLowerCase();
    return status.includes("pending") || status.includes("awaiting") || status.includes("query") || status === "open";
  });

  if (query.isLoading) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening your practice workspace...</p></div>;
  if (query.isError) return <section className="lc-workspace-error"><AlertTriangle /><div><h2>Practice workspace unavailable</h2><p>{query.error.message}</p></div><button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button></section>;

  const name = query.data?.profile.name || session?.user.name || "Counsel";
  const pendingAccept = (query.data?.paidIntakes || []).filter((item) => {
    const status = String(item.intakeStatus || item.stageStatus || "").toLowerCase();
    return status.includes("assigned") && !status.includes("accepted");
  });
  const heroAction = pickHeroAction([
    pendingAccept[0]
      ? {
          tone: "urgent" as const,
          kicker: "Urgent action required",
          title: `Accept intake · ${pendingAccept[0].clientName}`,
          detail: `${pendingAccept[0].legalIssueType || "Counsel request"} is waiting for your acceptance under LC supervision.`,
          ctaLabel: "Review paid intakes",
          href: "/advocate#paid-intakes",
          icon: Clock3,
        }
      : null,
    pendingProxy[0]
      ? {
          tone: "action" as const,
          kicker: "ProxyHub",
          title: `Posted task · ${pendingProxy[0].title || pendingProxy[0].taskDescription || "Proxy appearance"}`,
          detail: `${proxyStatusLabel(pendingProxy[0].status)} · Legal Connect assigns the proxy after payment.`,
          ctaLabel: "Open ProxyHub",
          href: "/advocate/proxy",
          icon: HandCoins,
        }
      : null,
    openTasks[0]
      ? {
          tone: "action" as const,
          kicker: "Action needed",
          title: `Chamber task · ${openTasks[0].title}`,
          detail: `Assigned to ${openTasks[0].assignee_name || "chamber"} · priority ${openTasks[0].priority || "normal"}`,
          ctaLabel: "Open Chamber Vault",
          href: "/advocate/chamber",
          icon: UsersRound,
        }
      : null,
    {
      tone: "clear" as const,
      kicker: "Practice status",
      title: `${activeCases.length} active matters · ${upcoming} listed hearings`,
      detail: "Sync stages and reply to LC-reviewed client updates from this desk.",
      ctaLabel: "Open my cases",
      href: "/advocate/cases",
      icon: BriefcaseBusiness,
    },
  ]);

  return (
    <div className="lc-workspace-page">
      <HeroActionBanner action={heroAction} />
      <section className="lc-command-hero lc-advocate-command">
        <div>
          <span className="lc-kicker">ADVOCATE PRACTICE DESK</span>
          <h2>{greetingFor()}, {name.replace(/^Adv\.\s*/i, "")}.</h2>
          <p>Your matters, chamber delegation and paid client intakes are synced here.</p>
          <div className="lc-hero-button-row" style={{ marginTop: "0.85rem" }}>
            <button className="lc-button lc-button-primary" type="button" onClick={() => setPostTaskOpen(true)}>
              <Plus /> Pay &amp; post proxy task
            </button>
            <Link className="lc-button" href="/advocate/proxy">Open ProxyHub</Link>
          </div>
        </div>
        <blockquote><p>{quote.original}</p><cite>{quote.translation} <strong>{quote.source}</strong></cite></blockquote>
        <span className={`lc-verification-badge ${["approved", "verified"].includes(query.data?.profile.verificationStatus || "") ? "verified" : "pending"}`}><ShieldCheck /> Enrollment {query.data?.profile.verificationStatus}</span>
      </section>

      <section className="lc-workspace-metrics">
        <div><BriefcaseBusiness /><span><strong>{activeCases.length}</strong><small>Active matters</small></span></div>
        <div><CalendarDays /><span><strong>{upcoming}</strong><small>Listed hearings</small></span></div>
        <div><HandCoins /><span><strong>{proxyTasks.length}</strong><small>Proxy tasks posted</small></span></div>
        <div><Clock3 /><span><strong>{openTasks.length}</strong><small>Open delegated tasks</small></span></div>
      </section>

      <section className="lc-practice-grid">
        <div className="lc-operational-panel lc-practice-cases">
          <header><div><span>Active matter desk</span><h2>Cases requiring attention</h2></div><Link href="/advocate/cases">All cases <ArrowRight /></Link></header>
          <div className="lc-practice-table" role="table" aria-label="Active cases">
            <div className="lc-practice-row lc-practice-row-head" role="row"><span>Case</span><span>Stage</span><span>NDOH</span><span>Action</span></div>
            {activeCases.length ? activeCases.map((matter) => {
              const stage = stageDrafts[matter.id] || matter.stage;
              return (
                <div className="lc-practice-row" role="row" key={matter.id}>
                  <span><strong>{matter.caseTitle}</strong><small>{matter.clientName || matter.caseNumber} · {matter.courtName}</small></span>
                  <select value={stage} onChange={(event) => setStageDrafts((current) => ({ ...current, [matter.id]: event.target.value }))}>
                    {!caseStages.includes(stage) && <option value={stage}>{stage}</option>}
                    {caseStages.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                  <span><strong>{matter.nextDate ? new Date(matter.nextDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Not listed"}</strong><small>{matter.appearanceRequired ? "Client required" : "Counsel appearance"}</small></span>
                  <button
                    className="lc-sync-button"
                    disabled={statusMutation.isPending || stage === matter.stage}
                    onClick={() => statusMutation.mutate({ caseId: matter.id, stage })}
                  >
                    {statusMutation.isPending && statusMutation.variables?.caseId === matter.id ? <RefreshCw className="lc-spin" /> : <CheckCircle2 />}
                    Sync
                  </button>
                </div>
              );
            }) : <p className="lc-inline-empty">No active matters are assigned to this enrollment.</p>}
          </div>
          {statusMutation.isSuccess && <p className="lc-sync-confirmation"><CheckCircle2 /> Status committed and shared with authorised workspaces.</p>}
          {statusMutation.isError && <p className="lc-sync-error"><AlertTriangle /> {statusMutation.error.message}</p>}
        </div>

        <aside className="lc-operational-panel lc-chamber-summary">
          <header><div><span>Chamber Vault</span><h2>{query.data?.chamber?.name || "Your chamber"}</h2></div><Link href="/advocate/chamber">Open <ArrowRight /></Link></header>
          <div className="lc-chamber-live"><i /><span><strong>Live task ledger</strong><small>Updates commit immediately</small></span></div>
          <div className="lc-chamber-task-list">
            {openTasks.slice(0, 5).map((task) => (
              <div key={task.id}><span><strong>{task.title}</strong><small>{task.assignee_name || "Unassigned"}</small></span><em>{task.status.replace("_", " ")}</em></div>
            ))}
            {!openTasks.length && <p className="lc-inline-empty">No delegated chamber work is pending.</p>}
          </div>
          <Link className="lc-chamber-action" href="/advocate/chamber"><UsersRound /> Delegate chamber work</Link>
        </aside>
      </section>

      <section className="lc-operational-panel" style={{ marginTop: 20 }}>
        <header>
          <div>
            <span>Daily cause list & hearing schedule</span>
            <h2>Listed matters with next date of hearing</h2>
          </div>
          <Link href="/advocate/diary">Open court diary <ArrowRight /></Link>
        </header>
        <div className="lc-chamber-task-list" style={{ padding: 16 }}>
          {activeCases.filter((matter) => matter.nextDate).slice(0, 6).map((matter) => (
            <div key={matter.id}>
              <span>
                <strong>{matter.caseTitle}</strong>
                <small>{matter.courtName || "Court"} · {matter.stage} · NDOH {new Date(matter.nextDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
              </span>
              <em>{matter.appearanceRequired ? "Client required" : "Counsel"}</em>
            </div>
          ))}
          {!activeCases.some((matter) => matter.nextDate) && (
            <p className="lc-inline-empty">No listed hearings yet. Sync matter stages and NDOH from your case desk.</p>
          )}
        </div>
      </section>

      <section className="lc-practice-grid" style={{ marginTop: 20 }}>
        <div className="lc-operational-panel" id="proxy-post-task">
          <header>
            <div>
              <span>ProxyHub · Post task</span>
              <h2>Pay &amp; post proxy appearances</h2>
            </div>
            <Link href="/advocate/proxy">Open ProxyHub <ArrowRight /></Link>
          </header>
          <div style={{ padding: 16 }}>
            <p className="lc-ops-meta" style={{ margin: 0 }}>
              Post court details, CNR, room and a fee of at least ₹400. After payment, Legal Connect Admin reviews and assigns a proxy advocate.
            </p>
            <div className="lc-hero-button-row" style={{ marginTop: 12 }}>
              <button className="lc-button lc-button-primary" type="button" onClick={() => setPostTaskOpen(true)}>
                <Plus /> Pay &amp; post task
              </button>
              <Link className="lc-button" href="/advocate/proxy">View all missions</Link>
            </div>
            <div className="lc-chamber-task-list" style={{ marginTop: 16 }}>
              {proxyTasks.slice(0, 5).map((task) => (
                <div key={String(task.id)}>
                  <span>
                    <strong>{task.title || task.taskDescription || "Proxy appearance"}</strong>
                    <small>
                      {task.court || task.location || "Court TBD"}
                      {task.cnr ? ` · CNR ${task.cnr}` : ""}
                      {task.amount != null || task.fee != null ? ` · ₹${Number(task.amount ?? task.fee).toLocaleString("en-IN")}` : ""}
                    </small>
                  </span>
                  <em>{proxyStatusLabel(task.status)}</em>
                </div>
              ))}
              {!proxyTasks.length && !proxyQuery.isLoading && (
                <p className="lc-inline-empty">No proxy tasks posted yet. Use Pay &amp; post task to create one.</p>
              )}
              {proxyQuery.isLoading && <p className="lc-inline-empty">Loading your ProxyHub posts…</p>}
            </div>
          </div>
        </div>

        <div className="lc-operational-panel">
          <header>
            <div>
              <span>Paid client intakes</span>
              <h2>New counsel requests after payment</h2>
            </div>
            <Link href="/advocate/bookings">Open bookings <ArrowRight /></Link>
          </header>
          <div className="lc-chamber-task-list" style={{ padding: 16 }}>
            {(query.data?.paidIntakes || []).slice(0, 5).map((intake) => {
              const status = String(intake.intakeStatus || intake.stageStatus || "").toLowerCase();
              const awaitingAccept = ["advocate_assigned", "assigned", "acknowledged_and_assigned"].includes(status);
              return (
                <div key={intake.id}>
                  <span>
                    <strong>{intake.clientName}</strong>
                    <small>{intake.legalIssueType} · {intake.intakeStatus || intake.paymentStatus}</small>
                  </span>
                  {awaitingAccept ? (
                    <button
                      className="lc-sync-button"
                      disabled={acceptIntake.isPending}
                      onClick={() => acceptIntake.mutate(intake.id)}
                    >
                      <CheckCircle2 /> Accept
                    </button>
                  ) : (
                    <em>{new Date(intake.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</em>
                  )}
                </div>
              );
            })}
            {!query.data?.paidIntakes?.length && (
              <p className="lc-inline-empty">No paid intakes are waiting in your practice desk.</p>
            )}
          </div>
          {acceptIntake.isSuccess && <p className="lc-sync-confirmation"><CheckCircle2 /> Matter accepted. Client and LC Admin have been notified.</p>}
          {acceptIntake.isError && <p className="lc-sync-error"><AlertTriangle /> {acceptIntake.error.message}</p>}
          <Link className="lc-chamber-action" href="/advocate/updates"><CheckCircle2 /> Post update for LC review</Link>
        </div>
      </section>

      <ActivityAuditTimeline
        title="Assigned Matters · Live Broadcast"
        emptyText="New assignments, stage syncs, chamber tasks and proxy accepts will appear here in real time."
        limit={18}
      />

      <section className="lc-practice-grid" style={{ marginTop: 20 }}>
        <div className="lc-operational-panel">
          <header>
            <div>
              <span>Supervised messaging</span>
              <h2>LC-reviewed case updates</h2>
            </div>
            <Link href="/advocate/updates">Post update <ArrowRight /></Link>
          </header>
          <div style={{ padding: 16 }}>
            <p className="lc-inline-empty" style={{ margin: 0 }}>
              Direct client chat is closed. Submit updates to Legal Connect for review before release.
            </p>
          </div>
        </div>

        <div className="lc-operational-panel">
          <header>
            <div>
              <span>NDOH alerts</span>
              <h2>Hearing reminders for clients</h2>
            </div>
            <Link href="/advocate/reminders">Open reminders <ArrowRight /></Link>
          </header>
          <div style={{ padding: 16 }}>
            <p className="lc-inline-empty" style={{ margin: 0 }}>
              Dispatch NDOH reminders with Order XVII CPC appearance guidance from the reminders desk.
            </p>
          </div>
        </div>
      </section>

      <TaskDialog
        open={postTaskOpen}
        onOpenChange={(open: boolean) => {
          setPostTaskOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            proxyQuery.refetch();
          }
        }}
        editingTask={null}
      />
    </div>
  );
}
