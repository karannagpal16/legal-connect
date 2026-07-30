import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  IndianRupee,
  MessageSquareText,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  dailyQuote,
  greetingFor,
  workspaceRequest,
  type WorkspaceCase,
} from "@/lib/workspace";

interface ClientWorkspace {
  ok: boolean;
  profile: { name: string; identity: string; verificationStatus: string };
  cases: WorkspaceCase[];
  bookings: Array<{ id: string; legalIssueType: string; paymentStatus?: string; status: string; createdAt: string }>;
  payments: Array<{ id: string; amount: number; currency: string; status: string; createdAt: string }>;
  dataMode: "live" | "sample";
}

type MatterTab = "overview" | "documents" | "communications" | "payments";

function formatDate(value?: string | null) {
  if (!value) return "Not listed";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function statusTone(status: string) {
  if (["paid", "verified", "approved", "active"].includes(status.toLowerCase())) return "success";
  if (["due", "pending", "intake"].includes(status.toLowerCase())) return "warning";
  return "neutral";
}

export function ClientHome() {
  const { session } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [tab, setTab] = useState<MatterTab>("overview");
  const quote = dailyQuote();
  const query = useQuery({
    queryKey: ["client-workspace", session?.user.id],
    queryFn: () => workspaceRequest<ClientWorkspace>("/api/workspaces/client", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!selectedCaseId && query.data?.cases[0]) setSelectedCaseId(query.data.cases[0].id);
  }, [query.data, selectedCaseId]);

  const selectedCase = useMemo(
    () => query.data?.cases.find((matter) => matter.id === selectedCaseId) || query.data?.cases[0],
    [query.data, selectedCaseId],
  );
  const name = query.data?.profile.name || session?.user.name || "Client";
  const dueFees = query.data?.cases.flatMap((matter) => matter.fees).filter((fee) => fee.status === "due") || [];
  const upcoming = query.data?.cases.filter((matter) => matter.nextDate).length || 0;

  if (query.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Preparing your private case workspace...</p></div>;
  }

  if (query.isError) {
    return (
      <section className="lc-workspace-error">
        <AlertTriangle />
        <div><h2>Workspace could not be opened</h2><p>{query.error.message}</p></div>
        <button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button>
      </section>
    );
  }

  return (
    <div className="lc-workspace-page">
      <section className="lc-command-hero">
        <div>
          <span className="lc-kicker">CLIENT COMMAND CENTRE</span>
          <h2>{greetingFor()}, {name}.</h2>
          <p>How should we assist you today?</p>
        </div>
        <blockquote>
          <p>{quote.original}</p>
          <cite>{quote.translation} <strong>{quote.source}</strong></cite>
        </blockquote>
        <span className={`lc-verification-badge ${query.data?.profile.verificationStatus === "approved" || query.data?.profile.verificationStatus === "verified" ? "verified" : "pending"}`}>
          <ShieldCheck /> Identity {query.data?.profile.verificationStatus || "pending"}
        </span>
      </section>

      <section className="lc-workspace-metrics" aria-label="Matter summary">
        <div><Scale /><span><strong>{query.data?.cases.length || 0}</strong><small>Total matters</small></span></div>
        <div><CalendarDays /><span><strong>{upcoming}</strong><small>Upcoming dates</small></span></div>
        <div><IndianRupee /><span><strong>{dueFees.length}</strong><small>Payments due</small></span></div>
        <div><MessageSquareText /><span><strong>{selectedCase?.communications.length || 0}</strong><small>Case updates</small></span></div>
      </section>

      {!query.data?.cases.length ? (
        <section className="lc-workspace-empty">
          <Gavel />
          <h2>No matters in your workspace</h2>
          <p>Start a paid intake. Legal Connect will review the issue and assign suitable verified counsel.</p>
          <Link className="lc-button lc-button-primary" href="/client/book">Start legal intake</Link>
        </section>
      ) : (
        <section className="lc-matter-workspace">
          <aside className="lc-matter-switcher">
            <header><span>My matters</span><small>{query.data.cases.length} records</small></header>
            <div>
              {query.data.cases.map((matter) => (
                <button
                  key={matter.id}
                  className={matter.id === selectedCase?.id ? "active" : ""}
                  onClick={() => { setSelectedCaseId(matter.id); setTab("overview"); }}
                >
                  <span><strong>{matter.caseTitle}</strong><small>{matter.caseNumber}</small></span>
                  <em>{matter.stage}</em>
                </button>
              ))}
            </div>
            <Link href="/client/book"><Gavel /> Start another intake</Link>
          </aside>

          {selectedCase && (
            <div className="lc-matter-detail">
              <header className="lc-matter-heading">
                <div>
                  <span>{selectedCase.courtName}</span>
                  <h2>{selectedCase.caseTitle}</h2>
                  <p>{selectedCase.caseNumber}</p>
                </div>
                <span className={`lc-status lc-status-${statusTone(selectedCase.status)}`}>{selectedCase.status}</span>
              </header>

              <div className="lc-stage-strip">
                <span><small>Current stage</small><strong>{selectedCase.stage}</strong></span>
                <i />
                <span><small>Next date of hearing</small><strong>{formatDate(selectedCase.nextDate)}</strong></span>
                <i />
                <span><small>Appearance</small><strong>{selectedCase.appearanceRequired ? "Required" : "Counsel appearing"}</strong></span>
              </div>

              {selectedCase.appearanceRequired && (
                <div className="lc-appearance-alert">
                  <AlertTriangle />
                  <div><strong>Your presence is required on the NDOH</strong><p>{selectedCase.costRisk || "Please coordinate with assigned counsel before the hearing."}</p></div>
                </div>
              )}

              <div className="lc-matter-tabs" role="tablist" aria-label="Matter details">
                {([
                  ["overview", "Overview"],
                  ["documents", `Documents ${selectedCase.documents.length}`],
                  ["communications", `Conversations ${selectedCase.communications.length}`],
                  ["payments", `Payments ${selectedCase.fees.length}`],
                ] as Array<[MatterTab, string]>).map(([value, label]) => (
                  <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="lc-matter-overview">
                  <section>
                    <span className="lc-section-icon"><Clock3 /></span>
                    <div><small>Next action</small><h3>{selectedCase.nextAction}</h3><p>Last synced with your case record.</p></div>
                  </section>
                  <section>
                    <span className="lc-section-icon"><UserRoundCheck /></span>
                    <div><small>Assigned counsel</small><h3>{selectedCase.counsel?.name || "Assignment pending"}</h3><p>{selectedCase.counsel?.enrollment || selectedCase.counsel?.contactPolicy || "Legal Connect will assign verified counsel after intake payment."}</p></div>
                  </section>
                  <section>
                    <span className="lc-section-icon"><CheckCircle2 /></span>
                    <div><small>Case record</small><h3>{selectedCase.documents.length} documents, {selectedCase.communications.length} communications</h3><p>Every item remains separated by matter to avoid cross-case disclosure.</p></div>
                  </section>
                </div>
              )}

              {tab === "documents" && (
                <div className="lc-record-list">
                  {selectedCase.documents.length ? selectedCase.documents.map((document) => (
                    <div key={document.id}><FileText /><span><strong>{document.name}</strong><small>{document.category} · uploaded {formatDate(document.uploadedAt)}</small></span><button title="Open document">Open</button></div>
                  )) : <p className="lc-inline-empty">No documents have been uploaded for this matter.</p>}
                </div>
              )}

              {tab === "communications" && (
                <div className="lc-record-list">
                  {selectedCase.communications.length ? selectedCase.communications.map((item) => (
                    <div key={item.id}><MessageSquareText /><span><strong>{item.title}</strong><small>{item.summary} · {formatDate(item.occurredAt)}{item.recordingStatus ? ` · ${item.recordingStatus}` : ""}</small></span><button title="Open conversation">Open</button></div>
                  )) : <p className="lc-inline-empty">No counsel communication has been recorded for this matter.</p>}
                </div>
              )}

              {tab === "payments" && (
                <div className="lc-record-list">
                  {selectedCase.fees.length ? selectedCase.fees.map((fee) => (
                    <div key={fee.id}><IndianRupee /><span><strong>{fee.label}</strong><small>{fee.dueDate ? `Due ${formatDate(fee.dueDate)}` : "Payment recorded"}</small></span><strong className="lc-fee-amount">₹{fee.amount.toLocaleString("en-IN")} · {fee.status}</strong></div>
                  )) : <p className="lc-inline-empty">No court fee or professional payment is due for this matter.</p>}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
