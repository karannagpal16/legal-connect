import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LockKeyhole, MessageSquareText, Phone, RefreshCw, Send, ShieldCheck, Video } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest, type WorkspaceCase, type WorkspaceCommunication } from "@/lib/workspace";

interface ClientWorkspace {
  ok: boolean;
  cases: WorkspaceCase[];
}

interface CommunicationsResponse {
  ok: boolean;
  communications: Array<WorkspaceCommunication & { senderId?: string }>;
  dataMode: "live" | "sample";
}

function initialCaseId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("caseId") || "";
}

function messageDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function ClientChat() {
  const { session } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const workspace = useQuery({
    queryKey: ["client-workspace", session?.user.id],
    queryFn: () => workspaceRequest<ClientWorkspace>("/api/workspaces/client", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const cases = Array.isArray(workspace.data?.cases) ? workspace.data.cases : [];

  useEffect(() => {
    if (!selectedCaseId && cases[0]) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  const selectedCase = useMemo(
    () => cases.find((matter) => matter.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId],
  );
  const communications = useQuery({
    queryKey: ["case-communications", selectedCase?.id],
    queryFn: () => workspaceRequest<CommunicationsResponse>(`/api/cases/${selectedCase?.id}/communications`, session?.token),
    enabled: Boolean(session?.token && selectedCase?.id),
    staleTime: 5_000,
  });

  const sendMessage = async () => {
    const summary = message.trim();
    if (!summary || !selectedCase || sending) return;
    setSending(true);
    setError("");
    try {
      await workspaceRequest(`/api/cases/${selectedCase.id}/communications`, session?.token, {
        method: "POST",
        body: JSON.stringify({ title: "Client message", summary }),
      });
      setMessage("");
      await communications.refetch();
      await workspace.refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Message could not be saved.");
    } finally {
      setSending(false);
    }
  };

  if (workspace.isLoading) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening Legal Connect matter messages...</p></div>;
  if (workspace.isError) return <section className="lc-workspace-error"><AlertTriangle /><div><h2>Messages could not be opened</h2><p>{workspace.error.message}</p></div><button className="lc-button lc-button-primary" onClick={() => workspace.refetch()}><RefreshCw /> Retry</button></section>;
  if (!cases.length) return <section className="lc-workspace-empty"><MessageSquareText /><h2>No matter room yet</h2><p>Submit an intake first. Supervised messages stay inside that matter — there is no direct advocate chat.</p><Link className="lc-button lc-button-primary" href="/client/book">Submit intake</Link></section>;

  return (
    <div className="lc-case-chat">
      <header className="lc-case-chat-head">
        <div><span className="lc-kicker">SUPERVISED BY LEGAL CONNECT</span><h2>Message Legal Connect</h2><p>Select a matter before writing. Messages stay on the LC record — counsel is not contacted directly.</p></div>
        <span><ShieldCheck /> LC gate active</span>
      </header>

      <div className="lc-case-chat-grid">
        <aside>
          <header><strong>My matters</strong><small>{cases.length} records</small></header>
          {cases.map((matter) => (
            <button key={matter.id} className={matter.id === selectedCase?.id ? "active" : ""} onClick={() => setSelectedCaseId(matter.id)}>
              <span><strong>{matter.caseTitle}</strong><small>{matter.caseNumber}</small></span><em>{matter.stage}</em>
            </button>
          ))}
        </aside>

        {selectedCase && (
          <section className="lc-message-room">
            <header>
              <div><small>{selectedCase.caseNumber}</small><h2>{selectedCase.caseTitle}</h2><p>{selectedCase.counsel?.name || "Counsel assignment pending"}</p></div>
              {selectedCase.counsel && <div className="lc-message-actions"><Link href={`/client/book?mode=call&caseId=${encodeURIComponent(selectedCase.id)}&caseTitle=${encodeURIComponent(selectedCase.caseTitle)}`}><Phone /> Book call</Link><Link href={`/client/book?mode=video&caseId=${encodeURIComponent(selectedCase.id)}&caseTitle=${encodeURIComponent(selectedCase.caseTitle)}`}><Video /> Book video</Link></div>}
            </header>
            <div className="lc-message-privacy"><LockKeyhole /><span><strong>Supervised matter record</strong><small>Visible to you and authorised Legal Connect staff. Counsel receives material only through LC-reviewed updates — not via direct chat.</small></span></div>
            <div className="lc-message-history">
              {communications.isLoading ? <p className="lc-inline-empty">Loading matter history...</p> : communications.data?.communications.length ? communications.data.communications.map((item) => {
                const fromCurrentUser = item.senderId && item.senderId === session?.user.id;
                return (
                  <article key={item.id} className={fromCurrentUser ? "mine" : ""}>
                    <span><strong>{fromCurrentUser ? "You" : item.title || "Matter update"}</strong><small>{messageDate(item.occurredAt)}</small></span>
                    <p>{item.summary}</p>
                  </article>
                );
              }) : <p className="lc-inline-empty">No conversation has been recorded for this matter.</p>}
            </div>
            <div className="lc-message-compose">
              {error && <div className="lc-form-error"><AlertTriangle /> {error}</div>}
              <div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message Legal Connect about ${selectedCase.caseTitle}`} rows={2} maxLength={4000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} /><button onClick={sendMessage} disabled={!message.trim() || sending} aria-label="Send matter message"><Send /></button></div>
              <small>Messages become part of this matter's LC-supervised activity record.</small>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
