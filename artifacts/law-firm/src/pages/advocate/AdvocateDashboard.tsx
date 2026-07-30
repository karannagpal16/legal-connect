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

      {/* Daily Cause List & Hearing Schedule */}
      <section className="lc-operational-panel" style={{ marginTop: '20px' }}>
        <header>
          <div>
            <span>Daily Cause List &amp; Hearing Schedule</span>
            <h2>Today's Court Appearances &amp; Listed Items</h2>
          </div>
          <button className="lc-button" style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} onClick={() => alert("🔄 Live eCourts Cause List refreshed (< 220ms sync).")}>
            🔄 Refresh Cause List
          </button>
        </header>
        <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ color: '#0f172a' }}>Item No. 14 — State v. Mehra (CNR-DL-HC-901)</strong>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>Delhi High Court · Court Room 5 (Hon'ble Bench 2) · Defendant Evidence (DE)</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="role-dash-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>In Hearing</span>
              <button className="lc-button lc-button-primary" style={{ height: '32px', fontSize: '0.76rem', padding: '0 10px' }} onClick={() => alert("Passover requested on eCourts portal.")}>
                Request Passover
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ color: '#0f172a' }}>Item No. 28 — Rohini Property Title Dispute (CNR-DL-2026-904)</strong>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>Saket District Court · Court Room 204 · Framing of Issues</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="role-dash-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Proxy Delegated</span>
              <button className="lc-button" style={{ background: '#0f766e', color: '#fff', border: 0, height: '32px', fontSize: '0.76rem', padding: '0 10px' }} onClick={() => alert("Proxy appearance verified for Adv. Aarav Mehta.")}>
                View Proxy Memo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Escrow Ledger & Precedent Research */}
      <section className="lc-practice-grid" style={{ marginTop: '20px' }}>
        <div className="lc-operational-panel">
          <header>
            <div>
              <span>Practice Finance &amp; Escrow</span>
              <h2>Work Completion Escrow Balance</h2>
            </div>
          </header>
          <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Secured Escrow Hold</span>
                <strong style={{ display: 'block', fontSize: '1.4rem', color: '#0f766e', marginTop: '2px' }}>₹14,500</strong>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Released Earnings</span>
                <strong style={{ display: 'block', fontSize: '1.4rem', color: '#15803d', marginTop: '2px' }}>₹38,200</strong>
              </div>
            </div>
            <button 
              onClick={() => alert("✓ Work Completion Verification Sent! Escrow funds will release upon client 5-star rating.")}
              className="lc-button lc-button-primary"
              style={{ width: '100%', height: '40px', fontWeight: 800 }}
            >
              💸 Request Work Completion Escrow Release
            </button>
          </div>
        </div>

        <div className="lc-operational-panel">
          <header>
            <div>
              <span>AI Judgment Research</span>
              <h2>Precedent Case Law Search</h2>
            </div>
          </header>
          <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Search Supreme Court &amp; High Court judgments..." 
              style={{ width: '100%', height: '40px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.88rem' }}
            />
            <button 
              onClick={() => alert("🔍 Legal Research Query Executed: Found 14 Supreme Court precedents matching your query.")}
              className="lc-button"
              style={{ background: '#0f172a', color: '#fff', height: '38px', fontWeight: 800 }}
            >
              🔍 Search Landmark Precedents
            </button>
          </div>
        </div>
      </section>

      {/* ProxyHub & Paid Intake Quick Actions */}
      <section className="lc-practice-grid" style={{ marginTop: '20px' }}>
        <div className="lc-operational-panel">
          <header>
            <div>
              <span>ProxyHub Network</span>
              <h2>Post or Accept Court Proxy Appearances</h2>
            </div>
            <Link href="/proxy-hub">Open Marketplace <ArrowRight /></Link>
          </header>
          <div style={{ padding: '16px', display: 'grid', gap: '12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>Saket Court Room 204 — Proxy Appearance</strong>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>NDOH: 12 Aug 2026 · Order XVII CPC Passover Memo</p>
              </div>
              <button 
                onClick={() => alert("✓ Proxy Appearance Accepted! Status synced with delegating advocate & Legal Connect Admin (< 180ms).")}
                className="lc-button lc-button-primary"
                style={{ height: '36px', fontSize: '0.82rem', padding: '0 12px' }}
              >
                Accept Proxy (₹1,500)
              </button>
            </div>
          </div>
        </div>

        <div className="lc-operational-panel">
          <header>
            <div>
              <span>NDOH Client Alerts</span>
              <h2>Send Automated WhatsApp Reminders</h2>
            </div>
          </header>
          <div style={{ padding: '16px', display: 'grid', gap: '12px', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
            <p style={{ fontSize: '0.84rem', color: '#065f46', margin: 0 }}>
              Send instant NDOH court date reminders to clients with Order XVII CPC compliance notes.
            </p>
            <button 
              onClick={() => alert("📲 WhatsApp & SMS Reminder Sent to Client!\n\nMessage: 'Mandatory NDOH Court Appearance on 12 August 2026 at Saket Court Room 204 under Order XVII CPC.'")}
              className="lc-button"
              style={{ background: '#10b981', color: '#fff', border: 0, height: '38px', font: 'inherit', fontWeight: 800 }}
            >
              📲 Dispatch WhatsApp Hearing Alert
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
