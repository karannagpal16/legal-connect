import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, Clock, AlertCircle, ChevronDown, ChevronUp, Bell, FileText, Phone, ArrowRight, Gavel } from "lucide-react";
import { Link } from "wouter";

interface CaseStep {
  id: string;
  title: string;
  desc: string;
  date?: string;
  status: "done" | "active" | "pending" | "blocked";
  detail?: string;
  note?: string;
}

interface Case {
  id: string;
  title: string;
  caseNo: string;
  court: string;
  advocate: string;
  type: string;
  nextDate: string;
  nextHearing: string;
  urgency: "high" | "medium" | "low";
  steps: CaseStep[];
}

const cases: Case[] = [
  {
    id: "c1",
    title: "Tenancy Dispute — Rohini Property",
    caseNo: "RC/DRC/2025/1142",
    court: "Delhi Rent Controller, Rohini",
    advocate: "Adv. Rishika Nagpal",
    type: "Civil / Tenancy",
    nextDate: "Apr 12, 2026",
    nextHearing: "Evidence — Examination of Witnesses",
    urgency: "high",
    steps: [
      { id: "s1", title: "Case Registered", desc: "Filed with Rent Controller, Rohini", date: "Sep 3, 2025", status: "done", detail: "Case number RC/DRC/2025/1142 assigned. Vakalatnama filed." },
      { id: "s2", title: "Legal Notice Sent", desc: "Notice sent to landlord via registered post", date: "Sep 10, 2025", status: "done", detail: "Registered AD notice sent. Received by landlord on Sep 14, 2025." },
      { id: "s3", title: "Summons Issued", desc: "Court issued summons to opposite party", date: "Oct 8, 2025", status: "done", detail: "Summons served. Landlord appeared through their advocate on Oct 22." },
      { id: "s4", title: "Written Statement Filed", desc: "Landlord's response submitted to court", date: "Nov 15, 2025", status: "done", detail: "WS filed by opposite party. Replication filed by us on Dec 2." },
      { id: "s5", title: "Evidence (In Progress)", desc: "Examination of witnesses and document submission", date: "Apr 12, 2026", status: "active", detail: "Your examination-in-chief is scheduled for April 12. You MUST be present.", note: "⚠️ Bring original rent agreement, payment receipts, and Aadhaar." },
      { id: "s6", title: "Cross Examination", desc: "Opposite party to cross-examine witnesses", status: "pending" },
      { id: "s7", title: "Arguments", desc: "Final arguments by both sides", status: "pending" },
      { id: "s8", title: "Judgement", desc: "Order pronounced by Rent Controller", status: "pending" },
    ],
  },
  {
    id: "c2",
    title: "Consumer Complaint — XYZ Electronics",
    caseNo: "CC/DCF-W/2025/0897",
    court: "District Consumer Forum, West Delhi",
    advocate: "Adv. Rishika Nagpal",
    type: "Consumer Protection",
    nextDate: "Apr 22, 2026",
    nextHearing: "Complaint Admission Hearing",
    urgency: "medium",
    steps: [
      { id: "s1", title: "Complaint Drafted", desc: "Consumer complaint prepared with all documents", date: "Feb 5, 2026", status: "done" },
      { id: "s2", title: "Complaint Filed", desc: "Filed at District Consumer Forum, West Delhi", date: "Feb 12, 2026", status: "done", detail: "Filing fee ₹200 paid. Receipt no. DCF/2026/4421." },
      { id: "s3", title: "Admission Hearing", desc: "Forum will decide whether to admit the complaint", date: "Apr 22, 2026", status: "active", note: "No personal appearance required for admission hearing." },
      { id: "s4", title: "Notice to Opposite Party", desc: "Notice will be sent to XYZ Electronics", status: "pending" },
      { id: "s5", title: "Reply by Opposite Party", desc: "Company must respond within 45 days", status: "pending" },
      { id: "s6", title: "Mediation (if applicable)", desc: "Forum may refer case to mediation first", status: "pending" },
      { id: "s7", title: "Final Order", desc: "Consumer Forum pronounces order with compensation", status: "pending" },
    ],
  },
];

const urgencyConfig = {
  high: { label: "Action Required", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25", dot: "bg-rose-400" },
  medium: { label: "On Track", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", dot: "bg-amber-400" },
  low: { label: "No Action Needed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400" },
};

const stepStatusConfig = {
  done: { icon: CheckCircle, color: "text-emerald-400", line: "bg-emerald-500", bg: "bg-emerald-500/20 border-emerald-500/30" },
  active: { icon: Clock, color: "text-primary", line: "bg-primary/40", bg: "bg-primary/20 border-primary/40" },
  pending: { icon: Circle, color: "text-white/20", line: "bg-white/10", bg: "bg-white/5 border-white/10" },
  blocked: { icon: AlertCircle, color: "text-rose-400", line: "bg-rose-500/40", bg: "bg-rose-500/10 border-rose-500/20" },
};

function StepIcon({ status }: { status: CaseStep["status"] }) {
  const cfg = stepStatusConfig[status];
  return <cfg.icon className={`w-5 h-5 ${cfg.color}`} />;
}

export function ClientCaseTracker() {
  const [expandedCase, setExpandedCase] = useState<string>(cases[0].id);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Gavel className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">My Case Tracker</h1>
          <p className="text-white/40 text-xs mt-0.5">Real-time status · No calls needed · Updated after every hearing</p>
        </div>
      </div>

      {/* Case summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cases.map(c => {
          const U = urgencyConfig[c.urgency];
          const activeStep = c.steps.find(s => s.status === "active");
          const doneCount = c.steps.filter(s => s.status === "done").length;
          const pct = Math.round((doneCount / c.steps.length) * 100);
          return (
            <button
              key={c.id}
              onClick={() => setExpandedCase(c.id)}
              className={`text-left bg-card/40 border rounded-2xl p-5 transition-all ${expandedCase === c.id ? "border-primary/40 bg-primary/5" : "border-white/10 hover:border-white/20"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-white font-bold text-sm">{c.title}</p>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${U.bg} ${U.color}`}>{U.label}</span>
              </div>
              <p className="text-white/35 text-xs mb-3">{c.court}</p>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full bg-primary rounded-full" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/30">{doneCount}/{c.steps.length} steps complete</span>
                <span className="text-primary font-bold">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded case timeline */}
      {cases.filter(c => c.id === expandedCase).map(c => {
        const U = urgencyConfig[c.urgency];
        const doneCount = c.steps.filter(s => s.status === "done").length;
        return (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Case header */}
            <div className="bg-card/40 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">{c.title}</h2>
                  <p className="text-white/35 text-sm mt-0.5">Case No: {c.caseNo}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${U.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${U.dot} animate-pulse`} />
                  <span className={`text-xs font-bold ${U.color}`}>{U.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Court", value: c.court },
                  { label: "Your Advocate", value: c.advocate },
                  { label: "Case Type", value: c.type },
                  { label: "Next Hearing", value: c.nextDate },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-white/30 text-xs">{item.label}</p>
                    <p className="text-white/70 text-xs font-semibold mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {c.urgency === "high" && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-rose-400 text-xs font-bold">Next: {c.nextHearing}</p>
                    <p className="text-white/40 text-xs">{c.nextDate} · Contact your advocate for preparation notes</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-card/40 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Case Progress Timeline
              </h3>
              <div className="space-y-0">
                {c.steps.map((step, idx) => {
                  const cfg = stepStatusConfig[step.status];
                  const isLast = idx === c.steps.length - 1;
                  const isExpanded = expandedStep === `${c.id}-${step.id}`;
                  return (
                    <div key={step.id} className="flex gap-4">
                      {/* Connector */}
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${cfg.bg}`}>
                          <StepIcon status={step.status} />
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 my-1 rounded-full min-h-[24px] ${cfg.line}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                        <button
                          className="w-full text-left"
                          onClick={() => setExpandedStep(isExpanded ? null : `${c.id}-${step.id}`)}
                          disabled={!step.detail && !step.note}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-bold ${step.status === "active" ? "text-primary" : step.status === "done" ? "text-white" : "text-white/35"}`}>
                                {step.title}
                                {step.status === "active" && <span className="ml-2 text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold">IN PROGRESS</span>}
                              </p>
                              <p className={`text-xs mt-0.5 ${step.status === "done" ? "text-white/40" : step.status === "active" ? "text-white/50" : "text-white/20"}`}>{step.desc}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {step.date && <p className="text-white/30 text-[10px]">{step.date}</p>}
                              {(step.detail || step.note) && (
                                <div className="mt-1">{isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25 ml-auto" />}</div>
                              )}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (step.detail || step.note) && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="mt-2 space-y-2">
                            {step.detail && <p className="text-white/50 text-xs leading-relaxed bg-white/4 rounded-lg px-3 py-2.5">{step.detail}</p>}
                            {step.note && <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">{step.note}</p>}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/client/chat">
                <button className="w-full flex items-center justify-center gap-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 py-3 rounded-xl text-sm font-bold transition-all">
                  <FileText className="w-4 h-4" /> Message Advocate
                </button>
              </Link>
              <Link href="/client/connect">
                <button className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 text-white border border-white/10 py-3 rounded-xl text-sm font-bold transition-all">
                  <Phone className="w-4 h-4" /> Request Call
                </button>
              </Link>
              <button className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 text-white/50 hover:text-white border border-white/8 py-3 rounded-xl text-sm font-bold transition-all">
                <Bell className="w-4 h-4" /> Set Hearing Reminder
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
