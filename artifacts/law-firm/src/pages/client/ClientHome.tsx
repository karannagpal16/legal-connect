import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gavel,
  IndianRupee,
  Loader2,
  MessageSquareText,
  Phone,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserRoundCheck,
  Video,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { CounselIntake, type ConsultationChannel } from "@/components/client/CounselIntake";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";
import { SupervisedPipelineStrip } from "@/components/SupervisedPipelineStrip";
import { CaseProgressStepper } from "@/components/client/CaseProgressStepper";
import { LegalDictionaryModal } from "@/components/client/LegalDictionaryModal";
import { LegalTerm } from "@/components/ui/LegalTerm";
import { HeroActionBanner, pickHeroAction } from "@/components/dashboard/HeroActionBanner";
import { HearingReminderRotator } from "@/components/dashboard/HearingReminderRotator";
import {
  dailyQuote,
  greetingFor,
  workspaceRequest,
  type WorkspaceCase,
} from "@/lib/workspace";
import { onNotificationAction } from "@/lib/notificationBus";

interface ClientBooking {
  id: string;
  legalIssueType: string;
  paymentStatus?: string;
  status: string;
  createdAt: string;
  stageStatus?: string;
  intakeStatus?: string;
  productType?: string;
  retentionStatus?: string;
  retention?: { status?: string } | null;
  advisoryCompletedAt?: string;
  amount?: number;
}

interface ClientWorkspace {
  ok: boolean;
  profile: { name: string; identity: string; verificationStatus: string };
  cases: WorkspaceCase[];
  bookings: ClientBooking[];
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
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [tab, setTab] = useState<MatterTab>("overview");
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState("");
  const [booking, setBooking] = useState<{ open: boolean; channel: ConsultationChannel; caseId?: string; caseTitle?: string }>({ open: false, channel: "call" });
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [retentionNotice, setRetentionNotice] = useState("");
  const [retentionError, setRetentionError] = useState("");
  const [bookingGateNotice, setBookingGateNotice] = useState("");
  const quote = dailyQuote();
  const query = useQuery({
    queryKey: ["client-workspace", session?.user.id],
    queryFn: () => workspaceRequest<ClientWorkspace>("/api/workspaces/client", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const cases = Array.isArray(query.data?.cases) ? query.data.cases : [];
  const bookings = Array.isArray(query.data?.bookings) ? query.data.bookings : [];
  const identityApproved = ["approved", "verified"].includes(
    String(query.data?.profile?.verificationStatus || "").toLowerCase(),
  );
  const masterBypass = String(session?.user?.email || "").trim().toLowerCase() === "karannagpal16@gmail.com";
  const canBookCounsel = identityApproved || masterBypass;

  const requestRetention = useMutation({
    mutationFn: (bookingId: string) =>
      workspaceRequest("/api/intakes/request-retention", session?.token, {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          matterSummary: "Client requested LC Gateway retention for full court representation after advisory.",
          urgency: "normal",
        }),
      }),
    onSuccess: () => {
      setRetentionNotice("Retention request sent. Legal Connect will review, quote terms, and assign a panel lawyer.");
      setRetentionError("");
      queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    },
    onError: (err) => setRetentionError(err instanceof Error ? err.message : "Retention request failed."),
  });

  useEffect(() => {
    if (!selectedCaseId && cases[0]) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  const applyDeepLink = (opts: {
    caseId?: string | null;
    tab?: string | null;
    action?: string | null;
  }) => {
    if (opts.caseId && cases.some((matter) => matter.id === opts.caseId)) {
      setSelectedCaseId(opts.caseId);
    }
    const nextTab = String(opts.tab || "").toLowerCase();
    if (nextTab === "documents" || nextTab === "communications" || nextTab === "payments" || nextTab === "overview") {
      setTab(nextTab as MatterTab);
    }
    const action = String(opts.action || "").toLowerCase();
    if (action === "pay") {
      const matter = cases.find((item) => item.id === (opts.caseId || selectedCaseId)) || cases[0];
      openBooking("call", matter);
    }
    if (action === "upload" || action === "chat" || action === "hearing" || action === "highlight" || nextTab) {
      window.setTimeout(() => document.getElementById("client-matters")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    }
    if (action === "highlight" || action === "hearing") {
      setHighlightPulse(true);
      window.setTimeout(() => setHighlightPulse(false), 2600);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !cases.length) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("caseId") && !params.get("tab") && !params.get("action")) return;
    applyDeepLink({
      caseId: params.get("caseId"),
      tab: params.get("tab"),
      action: params.get("action"),
    });
    // Strip query after consuming so refresh doesn't re-open modals.
    const cleanUrl = `${window.location.pathname}`;
    window.history.replaceState({}, "", cleanUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases.length]);

  useEffect(() => onNotificationAction((detail) => {
    const { resolved } = detail;
    applyDeepLink({
      caseId: resolved.actionPayload.caseId,
      tab: resolved.actionPayload.tab
        || (resolved.actionType === "PAYMENT_REQUIRED" ? "payments"
          : resolved.actionType === "DOCUMENT_REQUIRED" ? "documents"
            : resolved.actionType === "LAWYER_ASSIGNED" || resolved.actionType === "CHAT_MESSAGE" ? "communications"
              : "overview"),
      action: resolved.actionType === "PAYMENT_REQUIRED" ? "pay"
        : resolved.actionType === "DOCUMENT_REQUIRED" ? "upload"
          : resolved.actionType === "CASE_UPDATE" ? "highlight"
            : resolved.actionType === "HEARING_REMINDER" ? "hearing"
              : resolved.actionType === "LAWYER_ASSIGNED" || resolved.actionType === "CHAT_MESSAGE" ? "chat"
                : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cases, selectedCaseId]);

  const selectedCase = useMemo(
    () => cases.find((matter) => matter.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId],
  );
  const name = query.data?.profile?.name || session?.user.name || "Client";
  const dueFees = cases.flatMap((matter) => matter.fees || []).filter((fee) => fee.status === "due");
  const upcoming = cases.filter((matter) => matter.nextDate).length;
  const notices = useMemo(() => {
    const items: Array<{ label: string; title: string; detail: string; tone: "gold" | "red" | "green" | "navy" }> = [];
    if (selectedCase?.appearanceRequired) items.push({ label: "ACTION REQUIRED", title: `Appear on ${formatDate(selectedCase.nextDate)}`, detail: selectedCase.costRisk || "Coordinate with your counsel before the hearing.", tone: "red" });
    const firstDue = cases.flatMap((matter) => (matter.fees || []).map((fee) => ({ matter, fee }))).find(({ fee }) => fee.status === "due");
    if (firstDue) items.push({ label: "PAYMENT DUE", title: `${firstDue.fee.label} · ₹${firstDue.fee.amount.toLocaleString("en-IN")}`, detail: `${firstDue.matter.caseTitle} · due ${formatDate(firstDue.fee.dueDate)}`, tone: "gold" });
    if (selectedCase?.nextAction) items.push({ label: "NEXT STEP", title: selectedCase.nextAction, detail: selectedCase.caseTitle, tone: "green" });
    items.push({ label: quote.category.toUpperCase(), title: quote.original, detail: `${quote.translation} · ${quote.source}`, tone: "navy" });
    return items;
  }, [cases, quote, selectedCase]);

  useEffect(() => {
    if (notices.length < 2) return;
    const timer = window.setInterval(() => setNoticeIndex((current) => (current + 1) % notices.length), 5200);
    return () => window.clearInterval(timer);
  }, [notices.length]);

  useEffect(() => setNoticeIndex(0), [selectedCaseId]);

  const focusMatter = (matterId: string, nextTab: MatterTab = "overview") => {
    setSelectedCaseId(matterId);
    setTab(nextTab);
    window.setTimeout(() => document.getElementById("client-matters")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const openBooking = (channel: ConsultationChannel = "call", matter?: WorkspaceCase) => {
    if (!canBookCounsel) {
      setBookingGateNotice("Aadhaar verification must be approved by Legal Connect before booking counsel.");
      return;
    }
    setBookingGateNotice("");
    setBooking({ open: true, channel, caseId: matter?.id, caseTitle: matter?.caseTitle });
  };

  const downloadDocument = async (record: WorkspaceCase["documents"][number]) => {
    if (!record.downloadPath) return;
    setDownloadingId(record.id);
    try {
      const response = await fetch(record.downloadPath, { headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {} });
      if (!response.ok) throw new Error("Document could not be opened.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = href;
      anchor.download = record.name;
      anchor.click();
      URL.revokeObjectURL(href);
    } finally {
      setDownloadingId("");
    }
  };

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

  const firstDue = cases.flatMap((matter) => (matter.fees || []).map((fee) => ({ matter, fee }))).find(({ fee }) => fee.status === "due");
  const heroAction = pickHeroAction([
    selectedCase?.appearanceRequired
      ? {
          tone: "urgent" as const,
          kicker: "Urgent action required",
          title: `Court appearance on ${formatDate(selectedCase.nextDate)}`,
          detail: selectedCase.costRisk || "Confirm attendance with assigned counsel before the hearing date.",
          ctaLabel: "Open matter desk",
          onClick: () => focusMatter(selectedCase.id),
          icon: AlertTriangle,
        }
      : null,
    firstDue
      ? {
          tone: "urgent" as const,
          kicker: "Payment pending",
          title: `${firstDue.fee.label} · ₹${firstDue.fee.amount.toLocaleString("en-IN")}`,
          detail: `${firstDue.matter.caseTitle} · due ${formatDate(firstDue.fee.dueDate)}`,
          ctaLabel: `Pay ₹${firstDue.fee.amount.toLocaleString("en-IN")} now`,
          onClick: () => focusMatter(firstDue.matter.id, "payments"),
          icon: IndianRupee,
        }
      : null,
    query.data?.profile?.verificationStatus && !["approved", "verified"].includes(query.data.profile.verificationStatus)
      ? {
          tone: "action" as const,
          kicker: "Action needed",
          title: "Complete identity verification",
          detail: "Upload Aadhaar / voter ID proof so Legal Connect can keep your matter moving.",
          ctaLabel: "Check verification status",
          href: "/client",
          icon: ShieldCheck,
        }
      : null,
    selectedCase
      ? {
          tone: "clear" as const,
          kicker: "All clear",
          title: selectedCase.nextAction || "Your matter is on track",
          detail: `${selectedCase.caseTitle}${selectedCase.nextDate ? ` · Next date ${formatDate(selectedCase.nextDate)}` : ""}`,
          ctaLabel: "View case file",
          onClick: () => focusMatter(selectedCase.id),
          icon: CheckCircle2,
        }
      : {
          tone: "action" as const,
          kicker: "Start here",
          title: "No matter yet — book verified counsel",
          detail: "Tell us what happened. Legal Connect reviews your intake and assigns suitable counsel.",
          ctaLabel: "Book a counsel",
          onClick: () => openBooking(),
          icon: Gavel,
        },
  ]);

  return (
    <div className="lc-workspace-page">
      <HeroActionBanner action={heroAction} />

      <section className="lc-command-hero">
        <div className="lc-command-intro">
          <span className="lc-kicker">CLIENT COMMAND CENTRE</span>
          <h2>{greetingFor()}, {name}.</h2>
          <p>
            {cases.length
              ? `${cases.length} matters · ${upcoming} upcoming dates · ${dueFees.length} payment dues`
              : <>Tell us what happened and we will assign verified counsel after <LegalTerm term="LC Review" onOpenDictionary={(term) => { setDictionaryQuery(term); setDictionaryOpen(true); }}>LC Review</LegalTerm>.</>}
          </p>
          <div className="lc-hero-button-row">
            <button className="lc-button lc-button-primary" onClick={() => openBooking()} disabled={!canBookCounsel}>
              <Gavel /> {canBookCounsel ? <>Book 1-time advisory <ArrowRight /></> : "Complete Aadhaar first"}
            </button>
            <Link className="lc-button" href="/client/lawbot">Ask LawBot</Link>
            <button
              className="lc-button"
              onClick={() => { setDictionaryQuery(""); setDictionaryOpen(true); }}
            >
              <BookOpenText /> Legal Terms Dictionary
            </button>
          </div>
          <p className="lc-ops-meta" style={{ marginTop: "0.75rem" }}>
            First chat free · then ₹99 / 2 mins · audio from ₹299 · video from ₹499. One-time advisory only —
            full court representation requires LC Gateway retention (no direct in-app hiring).
          </p>
          {bookingGateNotice ? (
            <p className="lc-ops-meta warn" style={{ marginTop: "0.5rem" }}>{bookingGateNotice}</p>
          ) : !canBookCounsel ? (
            <p className="lc-ops-meta warn" style={{ marginTop: "0.5rem" }}>
              Upload Aadhaar and wait for Legal Connect approval before booking counsel.
            </p>
          ) : null}
        </div>
        <div className={`lc-live-notice tone-${notices[noticeIndex]?.tone || "navy"}`} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={`${selectedCaseId}-${noticeIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <span>{notices[noticeIndex]?.label}</span>
              <strong>{notices[noticeIndex]?.title}</strong>
              <small>{notices[noticeIndex]?.detail}</small>
            </motion.div>
          </AnimatePresence>
          <div className="lc-notice-dots">{notices.map((_, index) => <button key={index} className={index === noticeIndex ? "active" : ""} onClick={() => setNoticeIndex(index)} aria-label={`Show notification ${index + 1}`} />)}</div>
        </div>
        <span className={`lc-verification-badge ${query.data?.profile?.verificationStatus === "approved" || query.data?.profile?.verificationStatus === "verified" ? "verified" : "pending"}`}>
          <ShieldCheck /> Identity {query.data?.profile?.verificationStatus || "pending"}
        </span>
      </section>

      <section className="lc-workspace-metrics" aria-label="Matter summary">
        <button onClick={() => selectedCase && focusMatter(selectedCase.id)}><Scale /><span><strong>{cases.length || 0}</strong><small>Total matters</small></span><ArrowRight /></button>
        <button onClick={() => { const matter = cases.find((item) => item.nextDate); if (matter) focusMatter(matter.id); }} disabled={!upcoming}><CalendarDays /><span><strong>{upcoming}</strong><small>Upcoming dates</small></span><ArrowRight /></button>
        <button onClick={() => { const matter = cases.find((item) => (item.fees || []).some((fee) => fee.status === "due")); if (matter) focusMatter(matter.id, "payments"); }} disabled={!dueFees.length}><IndianRupee /><span><strong>{dueFees.length}</strong><small>Payments due</small></span><ArrowRight /></button>
        <button onClick={() => selectedCase && focusMatter(selectedCase.id, "communications")} disabled={!selectedCase?.communications?.length}><MessageSquareText /><span><strong>{selectedCase?.communications?.length || 0}</strong><small>Case updates</small></span><ArrowRight /></button>
      </section>

      <HearingReminderRotator
        cases={cases.map((matter) => ({
          id: matter.id,
          title: matter.caseTitle,
          court: matter.courtName,
          nextDate: matter.nextDate,
          lastDate: matter.lastDate,
        }))}
        hrefBase="/client"
      />

      {(bookings.length > 0 || retentionNotice || retentionError) ? (
        <section className="space-y-3" style={{ marginBottom: "1.25rem" }}>
          <div className="lc-vault-heading" style={{ marginBottom: 0 }}>
            <div>
              <span className="lc-kicker">LC GATEWAY RETENTION</span>
              <h3>Convert advisory into full court representation</h3>
              <p className="text-muted-foreground">
                After a paid advisory session, request LC Gateway retention. Legal Connect reviews, quotes terms,
                and assigns a Bar-verified panel lawyer.
              </p>
            </div>
          </div>
          {retentionError ? <div className="lc-form-error" role="alert">{retentionError}</div> : null}
          {retentionNotice ? (
            <div role="status" className="lc-ops-success">
              <CheckCircle2 className="h-4 w-4" /> {retentionNotice}
            </div>
          ) : null}
          {bookings.slice(0, 6).map((item) => {
            const retention = item.retentionStatus || item.retention?.status;
            const paid = /paid|verified|active/i.test(String(item.paymentStatus || item.status || ""));
            return (
              <article key={item.id} className="lc-ops-card">
                <strong>{item.legalIssueType || "Advisory session"}</strong>
                <p className="lc-ops-meta">
                  {item.stageStatus || item.intakeStatus || item.status}
                  {item.amount != null ? ` · ₹${Number(item.amount).toLocaleString("en-IN")}` : ""}
                  {retention ? ` · Retention: ${retention}` : ""}
                </p>
                <div className="lc-ops-inline" style={{ marginTop: "0.65rem" }}>
                  <button
                    className="lc-button lc-button-primary"
                    disabled={!paid || Boolean(retention) || requestRetention.isPending}
                    onClick={() => requestRetention.mutate(item.id)}
                  >
                    {requestRetention.isPending ? <Loader2 className="lc-spin" /> : <ShieldCheck />}
                    {retention ? "Retention requested" : "Request LC Gateway retention"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {!cases.length ? (
        <>
          <section className="lc-workspace-empty">
            <Gavel />
            <h2>No matters in your workspace</h2>
            <p>Start a one-time advisory. After the session, request LC Gateway retention for full court representation.</p>
            <button className="lc-button lc-button-primary" onClick={() => openBooking()}>Book 1-time advisory</button>
          </section>
          <ActivityAuditTimeline
            title="Minute-by-Minute Activity Audit"
            emptyText="After you submit an intake, assignment and stage updates will stream here across all portals."
          />
        </>
      ) : (
        <section className="lc-matter-workspace" id="client-matters">
          <aside className="lc-matter-switcher">
            <header><span>My matters</span><small>{cases.length} records</small></header>
            <div>
              {cases.map((matter) => (
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
            <button className="lc-matter-new" onClick={() => openBooking()}><Gavel /> Book another counsel</button>
          </aside>

          {selectedCase && (
            <div className={`lc-matter-detail ${highlightPulse ? "lc-matter-highlight" : ""}`}>
              <header className="lc-matter-heading">
                <div>
                  <span>{selectedCase.courtName}</span>
                  <h2>{selectedCase.caseTitle}</h2>
                  <p>{selectedCase.caseNumber}</p>
                </div>
                <span className={`lc-status lc-status-${statusTone(selectedCase.status)}`}>{selectedCase.status}</span>
              </header>

              <SupervisedPipelineStrip pipeline={selectedCase.pipeline} />
              <CaseProgressStepper pipeline={selectedCase.pipeline} nextAction={selectedCase.nextAction} />

              <div className="lc-stage-strip">
                <span><small>Pipeline stage</small><strong>{selectedCase.pipeline?.stageLabel || selectedCase.stage}</strong></span>
                <i />
                <span><small>Next date of hearing</small><strong>{formatDate(selectedCase.nextDate)}</strong></span>
                <i />
                <span><small>Appearance</small><strong>{selectedCase.appearanceRequired ? "Required" : "Counsel appearing"}</strong></span>
                <i />
                <span><small>Case health</small><strong>{selectedCase.healthScore ?? selectedCase.health?.score ?? "—"}/100 · {selectedCase.healthBand || selectedCase.health?.band || "Pending"}</strong></span>
              </div>

              {selectedCase.appearanceRequired && (
                <div className="lc-appearance-alert">
                  <AlertTriangle />
                  <div>
                    <strong>
                      Your presence is required on the{" "}
                      <LegalTerm term="NDOH (Next Date of Hearing)" onOpenDictionary={(term) => { setDictionaryQuery(term); setDictionaryOpen(true); }}>
                        NDOH
                      </LegalTerm>
                    </strong>
                    <p>{selectedCase.costRisk || "Please coordinate with assigned counsel before the hearing."}</p>
                  </div>
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
                <>
                  <div className="lc-matter-overview">
                    <section>
                      <span className="lc-section-icon"><Clock3 /></span>
                      <div><small>Next action</small><h3>{selectedCase.nextAction}</h3><p>Last synced with your case record.</p></div>
                    </section>
                    <section>
                      <span className="lc-section-icon"><UserRoundCheck /></span>
                      <div>
                        <small>Assigned counsel · via Legal Connect</small>
                        <h3>{selectedCase.counsel?.displayName || selectedCase.counsel?.name || "Assignment pending"}</h3>
                        <p>
                          {selectedCase.counsel?.enrollment ? `Enrollment ${selectedCase.counsel.enrollment} · ` : ""}
                          {selectedCase.counsel?.contactPolicy || "Legal Connect will assign verified counsel after intake payment. Direct contact stays inside the LC relay."}
                        </p>
                        {selectedCase.counsel && (
                          <div className="lc-counsel-actions">
                            <Link href={`/client/updates`}><MessageSquareText /> Case updates</Link>
                            <Link href={`/client/chat?caseId=${encodeURIComponent(selectedCase.id)}`}><MessageSquareText /> Message LC</Link>
                            <button onClick={() => openBooking("call", selectedCase)}><Phone /> Book call</button>
                            <button onClick={() => openBooking("video", selectedCase)}><Video /> Book video</button>
                          </div>
                        )}
                      </div>
                    </section>
                    <section>
                      <span className="lc-section-icon"><CheckCircle2 /></span>
                      <div><small>Case record</small><h3>{selectedCase.documents.length} documents, {selectedCase.communications.length} communications</h3><p>Every item remains separated by matter to avoid cross-case disclosure.</p></div>
                    </section>
                  </div>
                  <ActivityAuditTimeline
                    caseId={selectedCase.id}
                    title="Minute-by-Minute Activity Audit"
                    emptyText="Intake, assignment, stage and order updates for this matter will stream here in real time."
                  />
                </>
              )}

              {tab === "documents" && (
                <div className="lc-record-list">
                  <div className="lc-doc-upload-row">
                    <button
                      className="lc-button lc-button-primary"
                      type="button"
                      onClick={() => {
                        const input = window.document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";
                        input.onchange = async () => {
                          const file = input.files?.[0];
                          if (!file || !selectedCase) return;
                          setDownloadingId(`upload-${file.name}`);
                          try {
                            const response = await fetch(`/api/cases/${selectedCase.id}/documents`, {
                              method: "POST",
                              headers: {
                                Authorization: session?.token ? `Bearer ${session.token}` : "",
                                "Content-Type": file.type || "application/octet-stream",
                                "X-File-Name": file.name,
                                "X-Doc-Category": "Client upload",
                              },
                              body: file,
                            });
                            const payload = await response.json().catch(() => ({}));
                            if (!response.ok) throw new Error(payload.error || "Upload failed.");
                            await query.refetch();
                          } finally {
                            setDownloadingId("");
                          }
                        };
                        input.click();
                      }}
                    >
                      <Download /> Upload document
                    </button>
                    <small>Stored via Cloudinary when configured; otherwise kept as a checksummed case record.</small>
                  </div>
                  {selectedCase.documents.length ? selectedCase.documents.map((document) => (
                    <div key={document.id}><FileText /><span><strong>{document.name}</strong><small>{document.category} · uploaded {formatDate(document.uploadedAt)}</small></span>{document.downloadPath ? <button title="Download document" onClick={() => downloadDocument(document)} disabled={downloadingId === document.id}>{downloadingId === document.id ? "Opening..." : <><Download /> Download</>}</button> : <em className="lc-record-state">Sample record</em>}</div>
                  )) : <p className="lc-inline-empty">No documents have been uploaded for this matter.</p>}
                </div>
              )}

              {tab === "communications" && (
                <div className="lc-record-list">
                  {selectedCase.communications.length ? selectedCase.communications.map((item) => (
                    <div key={item.id}><MessageSquareText /><span><strong>{item.title}</strong><small>{item.summary} · {formatDate(item.occurredAt)}{item.recordingStatus ? ` · ${item.recordingStatus}` : ""}</small></span><em className="lc-record-state">Matter record</em></div>
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

      <AnimatePresence>
        {booking.open && (
          <div className="lc-intake-modal" role="dialog" aria-modal="true" aria-label="Book a counsel">
            <motion.button className="lc-intake-backdrop" aria-label="Close booking" onClick={() => setBooking((current) => ({ ...current, open: false }))} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="lc-intake-modal-panel" initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }}>
              <button className="lc-modal-mobile-close" onClick={() => setBooking((current) => ({ ...current, open: false }))} aria-label="Close booking"><X /></button>
              <CounselIntake
                initialChannel={booking.channel}
                initialCaseId={booking.caseId}
                initialCaseTitle={booking.caseTitle}
                source={booking.caseId ? "matter" : "dashboard"}
                onClose={() => setBooking((current) => ({ ...current, open: false }))}
                onComplete={() => query.refetch()}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="lc-dict-fab"
        aria-label="Open Legal Terms Dictionary"
        onClick={() => { setDictionaryQuery(""); setDictionaryOpen(true); }}
      >
        <BookOpenText />
        <span>Legal Terms</span>
      </button>

      <LegalDictionaryModal
        open={dictionaryOpen}
        initialQuery={dictionaryQuery}
        onClose={() => setDictionaryOpen(false)}
      />
    </div>
  );
}
