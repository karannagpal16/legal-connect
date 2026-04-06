import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Circle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Search, ExternalLink, RefreshCw, Hash, User, FileSearch, FileText,
  Loader2, X, ListOrdered, Eye, Scale, Landmark, Building2, Gavel,
  BookOpen, Star, Sparkles, Award
} from "lucide-react";

type SearchMode = "name" | "fir" | "cnr" | "case_no";
type CaseType = "all" | "criminal" | "civil" | "consumer" | "family" | "labour" | "property";

interface CaseStep {
  id: string;
  title: string;
  desc: string;
  date?: string;
  status: "done" | "active" | "pending" | "blocked";
  detail?: string;
  note?: string;
}

interface StudyCase {
  id: string;
  title: string;
  caseNo: string;
  cnr: string;
  firNo?: string;
  court: string;
  type: CaseType;
  typeLabel: string;
  petitioner: string;
  respondent: string;
  nextDate: string;
  nextHearing: string;
  urgency: "high" | "medium" | "low";
  lastOrder?: string;
  lastOrderDate?: string;
  assignedAdvocate: string;
  xpReward: number;
  learningTag: string;
  steps: CaseStep[];
  synced: boolean;
}

const studyCases: StudyCase[] = [
  {
    id: "ic1",
    title: "Tenancy Dispute — Rohini Property",
    caseNo: "RC/DRC/2025/1142",
    cnr: "DLRC01-001142-2025",
    court: "Rent Controller, Rohini, Delhi",
    type: "property",
    typeLabel: "Civil / Tenancy",
    petitioner: "Ramesh Kumar",
    respondent: "Suresh Gupta (Landlord)",
    nextDate: "Apr 12, 2026",
    nextHearing: "Evidence — Examination of Witnesses",
    urgency: "high",
    lastOrder: "Replication accepted. Matter fixed for plaintiff evidence.",
    lastOrderDate: "Mar 18, 2026",
    assignedAdvocate: "Adv. Rishika Nagpal",
    xpReward: 150,
    learningTag: "Evidence Law",
    synced: true,
    steps: [
      { id: "s1", title: "Case Registered", desc: "Filed with Rent Controller, Rohini", date: "Sep 3, 2025", status: "done", detail: "Observe: how a vakalatnama is filed and case numbering works." },
      { id: "s2", title: "Legal Notice Sent", desc: "Notice sent to landlord via registered post", date: "Sep 10, 2025", status: "done", detail: "Learn: Legal notice drafting under CPC. Registered AD post requirements." },
      { id: "s3", title: "Summons Issued", desc: "Court issued summons to opposite party", date: "Oct 8, 2025", status: "done" },
      { id: "s4", title: "Written Statement Filed", desc: "Landlord's response submitted to court", date: "Nov 15, 2025", status: "done" },
      { id: "s5", title: "Evidence (In Progress)", desc: "Examination of witnesses and document submission", date: "Apr 12, 2026", status: "active", note: "Study: How examination-in-chief works. What documents qualify as primary evidence." },
      { id: "s6", title: "Cross Examination", desc: "Opposite party to cross-examine", status: "pending" },
      { id: "s7", title: "Arguments", desc: "Final arguments by both sides", status: "pending" },
      { id: "s8", title: "Judgement", desc: "Order pronounced by Rent Controller", status: "pending" },
    ],
  },
  {
    id: "ic2",
    title: "State vs. Mohit Bansal — Cheating & Forgery",
    caseNo: "SC/ASJ/2026/0044",
    cnr: "DLPH03-000044-2026",
    firNo: "FIR/221/2025/PS-RajouriGarden",
    court: "Patiala House Courts, New Delhi",
    type: "criminal",
    typeLabel: "Criminal — IPC 420/468/471",
    petitioner: "State (through IO, PS Rajouri Garden)",
    respondent: "Mohit Bansal (Accused)",
    nextDate: "Apr 18, 2026",
    nextHearing: "Arguments on Charge",
    urgency: "high",
    lastOrder: "Charge-sheet filed. Accused present. Arguments on charge listed.",
    lastOrderDate: "Mar 25, 2026",
    assignedAdvocate: "Adv. Rishika Nagpal",
    xpReward: 200,
    learningTag: "Criminal Procedure",
    synced: true,
    steps: [
      { id: "s1", title: "FIR Registered", desc: "FIR 221/2025 at PS Rajouri Garden", date: "Nov 20, 2025", status: "done", detail: "Study: FIR registration process under S.154 CrPC. What information is recorded." },
      { id: "s2", title: "Investigation", desc: "Police investigation and evidence collection", date: "Dec 2025 – Feb 2026", status: "done", detail: "Learn: CDR analysis, bank record seizure, witness statement recording under S.161 CrPC." },
      { id: "s3", title: "Charge-sheet Filed", desc: "Police filed final report in court", date: "Mar 10, 2026", status: "done" },
      { id: "s4", title: "Arguments on Charge", desc: "Court to decide whether to frame charges", date: "Apr 18, 2026", status: "active", note: "Research: Difference between charge framing (S.228) and discharge (S.227) CrPC." },
      { id: "s5", title: "Charge Framed / Discharged", desc: "Court frames charge or discharges accused", status: "pending" },
      { id: "s6", title: "Prosecution Evidence", desc: "Prosecution witnesses examined", status: "pending" },
      { id: "s7", title: "Defence Evidence", desc: "Defence witnesses examined", status: "pending" },
      { id: "s8", title: "Final Arguments", desc: "Closing arguments by both sides", status: "pending" },
      { id: "s9", title: "Judgement", desc: "Court pronounces verdict", status: "pending" },
    ],
  },
  {
    id: "ic3",
    title: "Consumer Complaint — XYZ Electronics",
    caseNo: "CC/DCF-W/2025/0897",
    cnr: "DLCF02-000897-2025",
    court: "District Consumer Forum, West Delhi",
    type: "consumer",
    typeLabel: "Consumer Protection",
    petitioner: "Ramesh Kumar",
    respondent: "XYZ Electronics Pvt. Ltd.",
    nextDate: "Apr 22, 2026",
    nextHearing: "Complaint Admission Hearing",
    urgency: "medium",
    lastOrder: "Complaint registered. Listed for admission.",
    lastOrderDate: "Feb 12, 2026",
    assignedAdvocate: "Adv. Rishika Nagpal",
    xpReward: 120,
    learningTag: "Consumer Law",
    synced: true,
    steps: [
      { id: "s1", title: "Complaint Drafted", desc: "Consumer complaint prepared", date: "Feb 5, 2026", status: "done", detail: "Study: How to draft a consumer complaint under CPA 2019. Key sections: S.34, S.35." },
      { id: "s2", title: "Complaint Filed", desc: "Filed at District Consumer Forum", date: "Feb 12, 2026", status: "done" },
      { id: "s3", title: "Admission Hearing", desc: "Forum will decide whether to admit", date: "Apr 22, 2026", status: "active" },
      { id: "s4", title: "Notice to Opposite Party", desc: "Notice to XYZ Electronics", status: "pending" },
      { id: "s5", title: "Reply by Opposite Party", desc: "Company must respond within 45 days", status: "pending" },
      { id: "s6", title: "Final Order", desc: "Consumer Forum pronounces order", status: "pending" },
    ],
  },
  {
    id: "ic4",
    title: "Divorce Petition — Mutual Consent",
    caseNo: "HMA/DJ-S/2026/0312",
    cnr: "DLSKT04-000312-2026",
    court: "Family Court, Saket, Delhi",
    type: "family",
    typeLabel: "Family — HMA S.13B",
    petitioner: "Priya Sharma",
    respondent: "Amit Sharma",
    nextDate: "May 5, 2026",
    nextHearing: "Second Motion",
    urgency: "low",
    lastOrder: "First motion recorded. Cooling period commenced.",
    lastOrderDate: "Nov 5, 2025",
    assignedAdvocate: "Adv. Arjun Mehta",
    xpReward: 100,
    learningTag: "Family Law",
    synced: true,
    steps: [
      { id: "s1", title: "Petition Filed", desc: "Mutual consent petition under HMA S.13B", date: "Nov 5, 2025", status: "done", detail: "Study: S.13B HMA — grounds for mutual consent divorce and cooling period rationale." },
      { id: "s2", title: "First Motion", desc: "Joint statement recorded", date: "Nov 5, 2025", status: "done" },
      { id: "s3", title: "Cooling Period", desc: "6-month mandatory wait", date: "Nov 2025 – May 2026", status: "active", note: "Research: Can cooling period be waived? See Amardeep Singh vs Harveen Kaur (2017)." },
      { id: "s4", title: "Second Motion", desc: "Both parties reaffirm decision", date: "May 5, 2026", status: "pending" },
      { id: "s5", title: "Decree of Divorce", desc: "Court passes final decree", status: "pending" },
    ],
  },
  {
    id: "ic5",
    title: "Land Acquisition Challenge — NH-44",
    caseNo: "WP(C)/DHC/2026/2281",
    cnr: "DLHC06-002281-2026",
    court: "Delhi High Court",
    type: "civil",
    typeLabel: "Constitutional — Art 226",
    petitioner: "Farmers Welfare Association",
    respondent: "Union of India & NHAI",
    nextDate: "May 2, 2026",
    nextHearing: "Hearing on Interim Stay Application",
    urgency: "high",
    lastOrder: "Writ petition admitted. Notice issued. Stay on demolition granted.",
    lastOrderDate: "Mar 28, 2026",
    assignedAdvocate: "Adv. Rishika Nagpal",
    xpReward: 250,
    learningTag: "Constitutional Law",
    synced: true,
    steps: [
      { id: "s1", title: "Petition Filed", desc: "Writ petition under Art 226 before Delhi HC", date: "Mar 20, 2026", status: "done", detail: "Study: Art 226 vs Art 32 — when to approach HC vs SC. Scope of writ jurisdiction." },
      { id: "s2", title: "Urgent Listing", desc: "Matter listed for urgent hearing", date: "Mar 28, 2026", status: "done" },
      { id: "s3", title: "Notice & Interim Stay", desc: "HC issues notice, grants interim stay", date: "Mar 28, 2026", status: "done" },
      { id: "s4", title: "Reply by Respondents", desc: "Union of India & NHAI to file counter", date: "May 2, 2026", status: "active", note: "Draft: Prepare checklist of counter-affidavit points to anticipate." },
      { id: "s5", title: "Rejoinder", desc: "Petitioner to file rejoinder", status: "pending" },
      { id: "s6", title: "Arguments", desc: "Final hearing on merits", status: "pending" },
      { id: "s7", title: "Judgement", desc: "High Court pronounces order", status: "pending" },
    ],
  },
];

const caseTypeConfig: Record<CaseType, { label: string; color: string }> = {
  all: { label: "All Cases", color: "text-white" },
  criminal: { label: "Criminal", color: "text-rose-400" },
  civil: { label: "Civil", color: "text-blue-400" },
  consumer: { label: "Consumer", color: "text-amber-400" },
  family: { label: "Family", color: "text-pink-400" },
  labour: { label: "Labour", color: "text-teal-400" },
  property: { label: "Property", color: "text-emerald-400" },
};

const searchModeConfig: Record<SearchMode, { label: string; icon: typeof Search; placeholder: string }> = {
  name: { label: "Party Name", icon: User, placeholder: "Search by petitioner or respondent..." },
  fir: { label: "FIR Number", icon: FileSearch, placeholder: "e.g. FIR/221/2025/PS-RajouriGarden" },
  cnr: { label: "CNR Number", icon: Hash, placeholder: "e.g. DLRC01-001142-2025" },
  case_no: { label: "Case Number", icon: FileText, placeholder: "e.g. RC/DRC/2025/1142" },
};

const urgencyConfig = {
  high: { label: "Priority Study", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25", dot: "bg-rose-400" },
  medium: { label: "Active", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", dot: "bg-amber-400" },
  low: { label: "Observe", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400" },
};

const stepStatusConfig = {
  done: { icon: CheckCircle, color: "text-emerald-400", line: "bg-emerald-500", bg: "bg-emerald-500/20 border-emerald-500/30" },
  active: { icon: Clock, color: "text-primary", line: "bg-primary/40", bg: "bg-primary/20 border-primary/40" },
  pending: { icon: Circle, color: "text-white/20", line: "bg-white/10", bg: "bg-white/5 border-white/10" },
  blocked: { icon: AlertCircle, color: "text-rose-400", line: "bg-rose-500/40", bg: "bg-rose-500/10 border-rose-500/20" },
};

const ecourtLinks = [
  { title: "eCourts Case Status", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: Search, color: "from-blue-500 to-cyan-500" },
  { title: "Cause List", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: ListOrdered, color: "from-emerald-500 to-teal-500" },
  { title: "View Orders", url: "https://services.ecourts.gov.in/ecourtindia_v6/", icon: Eye, color: "from-violet-500 to-purple-500" },
  { title: "SCI Portal", url: "https://main.sci.gov.in/", icon: Landmark, color: "from-amber-500 to-orange-500" },
  { title: "Delhi HC", url: "https://delhihighcourt.nic.in/", icon: Building2, color: "from-rose-500 to-pink-500" },
  { title: "NJDG", url: "https://njdg.ecourts.gov.in/njdgnew/", icon: Scale, color: "from-indigo-500 to-blue-500" },
];

function StepIcon({ status }: { status: CaseStep["status"] }) {
  const cfg = stepStatusConfig[status];
  return <cfg.icon className={`w-5 h-5 ${cfg.color}`} />;
}

export function InternCaseTracker() {
  const [expandedCase, setExpandedCase] = useState<string>(studyCases[0].id);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CaseType>("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Today, 9:14 AM");

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      const now = new Date();
      setLastSync(`Today, ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
    }, 2500);
  };

  const filteredCases = studyCases.filter(c => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    switch (searchMode) {
      case "name": return c.petitioner.toLowerCase().includes(q) || c.respondent.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
      case "fir": return (c.firNo || "").toLowerCase().includes(q);
      case "cnr": return c.cnr.toLowerCase().includes(q);
      case "case_no": return c.caseNo.toLowerCase().includes(q);
      default: return true;
    }
  });

  const totalXP = studyCases.reduce((s, c) => s + c.xpReward, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-white">Case Study Tracker</h1>
            <p className="text-white/40 text-xs mt-0.5">Learn from live cases · eCourt synced · Earn XP</p>
          </div>
        </div>
        <button onClick={handleSync} disabled={syncing} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${syncing ? "bg-primary/10 border-primary/25 text-primary" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white"}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : `Sync · ${lastSync}`}
        </button>
      </div>

      {syncing && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <div>
            <p className="text-primary text-xs font-bold">Syncing case data from eCourt Services...</p>
            <p className="text-white/40 text-[10px]">Fetching latest orders and hearing status from ecourts.gov.in</p>
          </div>
        </motion.div>
      )}

      <div className="bg-gradient-to-r from-violet-500/10 via-primary/10 to-emerald-500/10 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <p className="text-white font-bold text-sm">Your Case Study Progress</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/25 text-[10px] uppercase tracking-wider font-bold">Cases Assigned</p>
            <p className="text-white text-xl font-black mt-1">{studyCases.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/25 text-[10px] uppercase tracking-wider font-bold">XP Available</p>
            <p className="text-primary text-xl font-black mt-1 flex items-center justify-center gap-1"><Sparkles className="w-4 h-4" /> {totalXP}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/25 text-[10px] uppercase tracking-wider font-bold">Case Types</p>
            <p className="text-amber-400 text-xl font-black mt-1">{new Set(studyCases.map(c => c.type)).size}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/25 text-[10px] uppercase tracking-wider font-bold">eCourt Synced</p>
            <p className="text-emerald-400 text-xl font-black mt-1">{studyCases.filter(c => c.synced).length}/{studyCases.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ecourtLinks.map(link => (
          <a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer" className="group bg-card/40 border border-white/10 hover:border-white/20 rounded-xl p-2.5 transition-all hover:bg-card/60 flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0`}>
              <link.icon className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-white text-[10px] font-bold group-hover:text-primary transition-colors leading-tight truncate">
              {link.title} <ExternalLink className="w-2 h-2 text-white/20 inline" />
            </p>
          </a>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(searchModeConfig) as SearchMode[]).map(mode => {
            const cfg = searchModeConfig[mode];
            const Icon = cfg.icon;
            return (
              <button key={mode} onClick={() => { setSearchMode(mode); setSearchQuery(""); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${searchMode === mode ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>
                <Icon className="w-3.5 h-3.5" /> {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={searchModeConfig[searchMode].placeholder} className="w-full bg-card/50 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50"><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(Object.keys(caseTypeConfig) as CaseType[]).map(ct => (
            <button key={ct} onClick={() => setTypeFilter(ct)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${typeFilter === ct ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/30 hover:text-white/50"}`}>
              {caseTypeConfig[ct].label}
            </button>
          ))}
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm font-semibold">No cases found</p>
          <p className="text-white/15 text-xs mt-1">Try a different search term or filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCases.map(c => {
              const U = urgencyConfig[c.urgency];
              const doneCount = c.steps.filter(s => s.status === "done").length;
              const pct = Math.round((doneCount / c.steps.length) * 100);
              const isSelected = expandedCase === c.id;
              return (
                <button key={c.id} onClick={() => setExpandedCase(c.id)} className={`text-left bg-card/40 border rounded-2xl p-4 transition-all ${isSelected ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-white font-bold text-sm leading-snug">{c.title}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${U.bg} ${U.color}`}>{U.label}</span>
                  </div>
                  <p className="text-white/25 text-[10px] mb-0.5">{c.caseNo}</p>
                  <p className="text-white/35 text-[10px] mb-2">{c.court}</p>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 ${caseTypeConfig[c.type].color}`}>{c.typeLabel}</span>
                    <span className="text-[9px] text-primary/60 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> +{c.xpReward} XP</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-1.5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full bg-primary rounded-full" />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/25">{doneCount}/{c.steps.length} steps</span>
                    <span className="text-primary font-bold">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/15">{c.learningTag}</span>
                    {c.synced && <span className="text-[9px] text-emerald-400/50 flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5" /> eCourt</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredCases.filter(c => c.id === expandedCase).map(c => {
            const U = urgencyConfig[c.urgency];
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-card/40 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h2 className="text-white font-bold text-lg">{c.title}</h2>
                      <p className="text-white/35 text-sm mt-0.5">Case No: {c.caseNo} · Mentor: {c.assignedAdvocate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary text-[10px] font-bold">+{c.xpReward} XP</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${U.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${U.dot} animate-pulse`} />
                        <span className={`text-xs font-bold ${U.color}`}>{U.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                    {[
                      { label: "CNR Number", value: c.cnr },
                      { label: "Court", value: c.court },
                      { label: "Case Type", value: c.typeLabel },
                      { label: "Learning Focus", value: c.learningTag },
                      { label: "Next Hearing", value: c.nextDate },
                    ].map(item => (
                      <div key={item.label} className="bg-white/3 rounded-lg px-3 py-2">
                        <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
                        <p className="text-white/70 text-xs font-semibold mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/3 rounded-lg px-3 py-2">
                      <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">Petitioner</p>
                      <p className="text-white/70 text-xs font-semibold mt-0.5">{c.petitioner}</p>
                    </div>
                    <div className="bg-white/3 rounded-lg px-3 py-2">
                      <p className="text-white/25 text-[10px] font-semibold uppercase tracking-wider">Respondent</p>
                      <p className="text-white/70 text-xs font-semibold mt-0.5">{c.respondent}</p>
                    </div>
                  </div>

                  {c.firNo && (
                    <div className="bg-rose-500/8 border border-rose-500/15 rounded-lg px-3 py-2 mb-4">
                      <p className="text-rose-400/50 text-[10px] font-semibold uppercase tracking-wider">FIR Number</p>
                      <p className="text-rose-400 text-xs font-bold mt-0.5">{c.firNo}</p>
                    </div>
                  )}

                  {c.lastOrder && (
                    <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Last Order — {c.lastOrderDate}</p>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">{c.lastOrder}</p>
                    </div>
                  )}
                </div>

                <div className="bg-card/40 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Case Progress & Study Notes
                  </h3>
                  <div className="space-y-0">
                    {c.steps.map((step, idx) => {
                      const cfg = stepStatusConfig[step.status];
                      const isLast = idx === c.steps.length - 1;
                      const isExpanded = expandedStep === `${c.id}-${step.id}`;
                      return (
                        <div key={step.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${cfg.bg}`}>
                              <StepIcon status={step.status} />
                            </div>
                            {!isLast && <div className={`w-0.5 flex-1 my-1 rounded-full min-h-[24px] ${cfg.line}`} />}
                          </div>
                          <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                            <button className="w-full text-left" onClick={() => setExpandedStep(isExpanded ? null : `${c.id}-${step.id}`)} disabled={!step.detail && !step.note}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`text-sm font-bold ${step.status === "active" ? "text-primary" : step.status === "done" ? "text-white" : "text-white/35"}`}>
                                    {step.title}
                                    {step.status === "active" && <span className="ml-2 text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold">STUDY NOW</span>}
                                  </p>
                                  <p className={`text-xs mt-0.5 ${step.status === "done" ? "text-white/40" : step.status === "active" ? "text-white/50" : "text-white/20"}`}>{step.desc}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {step.date && <p className="text-white/30 text-[10px]">{step.date}</p>}
                                  {(step.detail || step.note) && <div className="mt-1">{isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25 ml-auto" />}</div>}
                                </div>
                              </div>
                            </button>
                            {isExpanded && (step.detail || step.note) && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2">
                                {step.detail && (
                                  <div className="bg-violet-500/8 border border-violet-500/15 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                    <BookOpen className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-violet-300/80 text-xs leading-relaxed">{step.detail}</p>
                                  </div>
                                )}
                                {step.note && (
                                  <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                    <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-amber-400 text-xs leading-relaxed">{step.note}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}
