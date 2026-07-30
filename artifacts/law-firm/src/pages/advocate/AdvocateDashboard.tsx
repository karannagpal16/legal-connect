import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { dailyQuote, greetingFor, workspaceRequest, type WorkspaceCase } from "@/lib/workspace";

interface ChamberTask {
  id: string;
  title: string;
  assignee_name: string;
  status: string;
  priority: string;
  due_at?: string;
}

interface AdvocateWorkspace {
  ok: boolean;
  profile: { name: string; enrollmentNo: string; stateBarCouncil: string; practiceCourts: string; verificationStatus: string };
  cases: WorkspaceCase[];
  paidIntakes: Array<{ id: string; clientName: string; legalIssueType: string; paymentStatus: string; createdAt: string }>;
  chamber: { id: string; name: string; members: unknown[]; tasks: ChamberTask[] } | null;
  dataMode: "live" | "sample";
}

const caseStages = ["Intake Review", "Drafting", "Pleadings", "Evidence", "Arguments", "Order Reserved", "Disposed"];

export function AdvocateDashboard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [stageDrafts, setStageDrafts] = useState<Record<string, string>>({});
  const quote = dailyQuote();
  const query = useQuery({
    queryKey: ["advocate-workspace", session?.user.id],
    queryFn: () => workspaceRequest<AdvocateWorkspace>("/api/workspaces/advocate", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 15_000,
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
  const activeCases = useMemo(() => query.data?.cases.filter((matter) => !["Disposed", "Closed"].includes(matter.status)) || [], [query.data]);
  const upcoming = activeCases.filter((matter) => matter.nextDate).length;
  const openTasks = query.data?.chamber?.tasks.filter((task) => task.status !== "completed") || [];

  if (query.isLoading) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening your practice workspace...</p></div>;
  if (query.isError) return <section className="lc-workspace-error"><AlertTriangle /><div><h2>Practice workspace unavailable</h2><p>{query.error.message}</p></div><button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button></section>;

  const name = query.data?.profile.name || session?.user.name || "Counsel";

  return (
    <div className="lc-workspace-page">
      <section className="lc-command-hero lc-advocate-command">
        <div>
          <span className="lc-kicker">ADVOCATE PRACTICE DESK</span>
          <h2>{greetingFor()}, {name.replace(/^Adv\.\s*/i, "")}.</h2>
          <p>Your matters, chamber delegation and paid client intakes are synced here.</p>
        </div>
        <blockquote><p>{quote.original}</p><cite>{quote.translation} <strong>{quote.source}</strong></cite></blockquote>
        <span className={`lc-verification-badge ${["approved", "verified"].includes(query.data?.profile.verificationStatus || "") ? "verified" : "pending"}`}><ShieldCheck /> Enrollment {query.data?.profile.verificationStatus}</span>
      </section>

      <section className="lc-workspace-metrics">
        <div><BriefcaseBusiness /><span><strong>{activeCases.length}</strong><small>Active matters</small></span></div>
        <div><CalendarDays /><span><strong>{upcoming}</strong><small>Listed hearings</small></span></div>
        <div><UsersRound /><span><strong>{query.data?.chamber?.members.length || 0}</strong><small>Chamber members</small></span></div>
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
    </div>
  );
}
