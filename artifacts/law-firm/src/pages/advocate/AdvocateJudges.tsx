import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ExternalLink, Scale, Calendar, Clock,
  ChevronDown, ChevronRight, AlertCircle, FileText,
  ListOrdered, Eye, Gavel, Building2, Landmark, Shield,
  UserCheck, UserX, Filter
} from "lucide-react";

type CourtLevel = "supreme" | "high" | "district";

interface Judge {
  name: string;
  designation: string;
  bench?: string;
  onLeave: boolean;
  leaveUntil?: string;
  leaveReason?: string;
}

interface Court {
  id: string;
  level: CourtLevel;
  name: string;
  location: string;
  judges: Judge[];
}

const courts: Court[] = [
  {
    id: "sc",
    level: "supreme",
    name: "Supreme Court of India",
    location: "New Delhi",
    judges: [
      { name: "Hon'ble Justice Sanjiv Khanna", designation: "Chief Justice of India", onLeave: false },
      { name: "Hon'ble Justice B.R. Gavai", designation: "Judge", bench: "Bench I", onLeave: false },
      { name: "Hon'ble Justice Surya Kant", designation: "Judge", bench: "Bench II", onLeave: true, leaveUntil: "Apr 10, 2026", leaveReason: "Personal" },
      { name: "Hon'ble Justice Vikram Nath", designation: "Judge", bench: "Bench III", onLeave: false },
      { name: "Hon'ble Justice Abhay S. Oka", designation: "Judge", bench: "Bench I", onLeave: false },
      { name: "Hon'ble Justice J.K. Maheshwari", designation: "Judge", bench: "Bench IV", onLeave: false },
      { name: "Hon'ble Justice Hima Kohli", designation: "Judge", bench: "Bench II", onLeave: true, leaveUntil: "Apr 8, 2026", leaveReason: "Medical" },
      { name: "Hon'ble Justice Pamidighantam Sri Narasimha", designation: "Judge", bench: "Bench III", onLeave: false },
      { name: "Hon'ble Justice Bela M. Trivedi", designation: "Judge", bench: "Bench V", onLeave: false },
      { name: "Hon'ble Justice Manoj Misra", designation: "Judge", bench: "Bench IV", onLeave: false },
      { name: "Hon'ble Justice Rajesh Bindal", designation: "Judge", bench: "Bench V", onLeave: false },
      { name: "Hon'ble Justice Aravind Kumar", designation: "Judge", bench: "Bench VI", onLeave: true, leaveUntil: "Apr 12, 2026", leaveReason: "Official Duty" },
      { name: "Hon'ble Justice Sanjay Kumar", designation: "Judge", bench: "Bench VI", onLeave: false },
      { name: "Hon'ble Justice M.M. Sundresh", designation: "Judge", bench: "Bench VII", onLeave: false },
      { name: "Hon'ble Justice Prasanna B. Varale", designation: "Judge", bench: "Bench VII", onLeave: false },
    ],
  },
  {
    id: "dhc",
    level: "high",
    name: "Delhi High Court",
    location: "New Delhi",
    judges: [
      { name: "Hon'ble Justice Manmohan", designation: "Chief Justice", onLeave: false },
      { name: "Hon'ble Justice Vibhu Bakhru", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice Suresh Kumar Kait", designation: "Judge", bench: "Div. Bench II", onLeave: true, leaveUntil: "Apr 9, 2026", leaveReason: "Personal" },
      { name: "Hon'ble Justice Rajiv Shakdher", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice Rekha Palli", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Yashwant Varma", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Prathiba M. Singh", designation: "Judge", bench: "Single Bench (IPR)", onLeave: false },
      { name: "Hon'ble Justice Navin Chawla", designation: "Judge", bench: "Single Bench", onLeave: true, leaveUntil: "Apr 11, 2026", leaveReason: "Medical" },
      { name: "Hon'ble Justice Purushaindra Kumar Kaurav", designation: "Judge", bench: "Div. Bench III", onLeave: false },
      { name: "Hon'ble Justice Chandra Dhari Singh", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Amit Bansal", designation: "Judge", bench: "Single Bench (Commercial)", onLeave: false },
      { name: "Hon'ble Justice Mini Pushkarna", designation: "Judge", bench: "Single Bench", onLeave: false },
    ],
  },
  {
    id: "bhc",
    level: "high",
    name: "Bombay High Court",
    location: "Mumbai",
    judges: [
      { name: "Hon'ble Justice Devendra Kumar Upadhyaya", designation: "Chief Justice", onLeave: false },
      { name: "Hon'ble Justice G.S. Patel", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice Nitin Jamdar", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice S.V. Gangapurwala", designation: "Judge", bench: "Div. Bench II", onLeave: true, leaveUntil: "Apr 13, 2026", leaveReason: "Personal" },
      { name: "Hon'ble Justice Milind N. Jadhav", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Manish Pitale", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Arif S. Doctor", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Sharmila U. Deshmukh", designation: "Judge", bench: "Div. Bench III", onLeave: false },
    ],
  },
  {
    id: "ahc",
    level: "high",
    name: "Allahabad High Court",
    location: "Prayagraj",
    judges: [
      { name: "Hon'ble Justice Arun Bhansali", designation: "Chief Justice", onLeave: false },
      { name: "Hon'ble Justice Manoj Kumar Gupta", designation: "Senior Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice Sunita Agarwal", designation: "Judge", bench: "Div. Bench II", onLeave: true, leaveUntil: "Apr 10, 2026", leaveReason: "Official Tour" },
      { name: "Hon'ble Justice Siddharth", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Rajesh Singh Chauhan", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice Ashwani Kumar Mishra", designation: "Judge", bench: "Div. Bench III", onLeave: false },
      { name: "Hon'ble Justice Vivek Kumar Birla", designation: "Judge", bench: "Single Bench (Criminal)", onLeave: false },
    ],
  },
  {
    id: "mhc",
    level: "high",
    name: "Madras High Court",
    location: "Chennai",
    judges: [
      { name: "Hon'ble Justice R. Mahadevan", designation: "Chief Justice", onLeave: false },
      { name: "Hon'ble Justice S.S. Sundar", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice D. Krishnakumar", designation: "Judge", bench: "Single Bench", onLeave: true, leaveUntil: "Apr 14, 2026", leaveReason: "Medical" },
      { name: "Hon'ble Justice G.R. Swaminathan", designation: "Judge", bench: "Madurai Bench", onLeave: false },
      { name: "Hon'ble Justice S. Srimathy", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice N. Anand Venkatesh", designation: "Judge", bench: "Div. Bench II", onLeave: false },
    ],
  },
  {
    id: "khc",
    level: "high",
    name: "Karnataka High Court",
    location: "Bengaluru",
    judges: [
      { name: "Hon'ble Justice N.V. Anjaria", designation: "Chief Justice", onLeave: false },
      { name: "Hon'ble Justice Krishna S. Dixit", designation: "Judge", bench: "Div. Bench I", onLeave: false },
      { name: "Hon'ble Justice Sachin Shankar Magadum", designation: "Judge", bench: "Single Bench", onLeave: false },
      { name: "Hon'ble Justice M. Nagaprasanna", designation: "Judge", bench: "Div. Bench II", onLeave: true, leaveUntil: "Apr 9, 2026", leaveReason: "Personal" },
      { name: "Hon'ble Justice Hemant Chandangoudar", designation: "Judge", bench: "Dharwad Bench", onLeave: false },
    ],
  },
  {
    id: "dd-new-delhi",
    level: "district",
    name: "Patiala House Courts",
    location: "New Delhi",
    judges: [
      { name: "Sh. Aman Lekhi", designation: "Principal District & Sessions Judge", onLeave: false },
      { name: "Sh. Dharmesh Sharma", designation: "ASJ (Special Court — ED)", onLeave: false },
      { name: "Sh. Ajay Kumar Kuhar", designation: "Addl. Sessions Judge", onLeave: true, leaveUntil: "Apr 8, 2026", leaveReason: "Personal" },
      { name: "Sh. Sumit Dass", designation: "Metropolitan Magistrate", onLeave: false },
      { name: "Smt. Vaishali Jain", designation: "Metropolitan Magistrate", onLeave: false },
      { name: "Sh. Pulastya Pramachala", designation: "Addl. Sessions Judge", onLeave: false },
    ],
  },
  {
    id: "dd-saket",
    level: "district",
    name: "Saket District Courts",
    location: "New Delhi",
    judges: [
      { name: "Sh. Vikas Dhull", designation: "Principal District Judge", onLeave: false },
      { name: "Smt. Sushma Yadav", designation: "Addl. District Judge", onLeave: false },
      { name: "Sh. Ravi Kumar Jain", designation: "Addl. Sessions Judge", onLeave: true, leaveUntil: "Apr 10, 2026", leaveReason: "Medical" },
      { name: "Smt. Priya Ranjan", designation: "Civil Judge", onLeave: false },
      { name: "Sh. Atul Sharma", designation: "Metropolitan Magistrate", onLeave: false },
    ],
  },
  {
    id: "dd-tis-hazari",
    level: "district",
    name: "Tis Hazari Courts",
    location: "New Delhi",
    judges: [
      { name: "Sh. Naresh Kumar Malhotra", designation: "Principal District & Sessions Judge", onLeave: false },
      { name: "Smt. Kaveri Baweja", designation: "Addl. Sessions Judge", onLeave: false },
      { name: "Sh. Vinod Yadav", designation: "Addl. Sessions Judge (NDPS)", onLeave: false },
      { name: "Sh. Pankaj Sharma", designation: "Metropolitan Magistrate", onLeave: true, leaveUntil: "Apr 7, 2026", leaveReason: "Personal" },
      { name: "Smt. Aakansha Vyas", designation: "Civil Judge (Jr.)", onLeave: false },
    ],
  },
  {
    id: "dd-dwarka",
    level: "district",
    name: "Dwarka Courts",
    location: "New Delhi",
    judges: [
      { name: "Sh. Sunil Kumar", designation: "Principal District Judge", onLeave: false },
      { name: "Sh. Amit Sahni", designation: "Addl. District Judge", onLeave: false },
      { name: "Smt. Neelam Yadav", designation: "Addl. Sessions Judge", onLeave: false },
      { name: "Sh. Tushar Gupta", designation: "Metropolitan Magistrate", onLeave: true, leaveUntil: "Apr 11, 2026", leaveReason: "Medical" },
    ],
  },
  {
    id: "dd-karkardooma",
    level: "district",
    name: "Karkardooma Courts",
    location: "East Delhi",
    judges: [
      { name: "Sh. Anil Kumar Yadav", designation: "Principal District & Sessions Judge", onLeave: false },
      { name: "Sh. Manoj Kumar", designation: "Addl. Sessions Judge", onLeave: false },
      { name: "Smt. Prerna Bist", designation: "Civil Judge (Sr.)", onLeave: true, leaveUntil: "Apr 9, 2026", leaveReason: "Training" },
      { name: "Sh. Rahul Jain", designation: "Metropolitan Magistrate", onLeave: false },
    ],
  },
  {
    id: "dd-rohini",
    level: "district",
    name: "Rohini Courts",
    location: "North-West Delhi",
    judges: [
      { name: "Sh. Sanjay Garg", designation: "Principal District Judge", onLeave: false },
      { name: "Smt. Archana Mishra", designation: "Addl. Sessions Judge", onLeave: false },
      { name: "Sh. Devender Kumar", designation: "Addl. District Judge", onLeave: false },
      { name: "Sh. Kamal Kant Sharma", designation: "Chief Metropolitan Magistrate", onLeave: true, leaveUntil: "Apr 12, 2026", leaveReason: "Personal" },
    ],
  },
];

const ecourtLinks = [
  {
    title: "eCourts Cause List",
    description: "View daily cause lists for all courts — know when your case is listed",
    url: "https://services.ecourts.gov.in/ecourtindia_v6/",
    icon: ListOrdered,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "View Last Orders",
    description: "Access the latest orders and judgments passed by any court",
    url: "https://services.ecourts.gov.in/ecourtindia_v6/",
    icon: Eye,
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Case Status & Tracking",
    description: "Track your case by CNR number, party name, filing number, or FIR",
    url: "https://services.ecourts.gov.in/ecourtindia_v6/",
    icon: FileText,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Supreme Court — SCI Website",
    description: "Official Supreme Court portal for cause lists, judgments & daily orders",
    url: "https://main.sci.gov.in/",
    icon: Landmark,
    color: "from-amber-500 to-orange-500",
  },
  {
    title: "Delhi HC — DHC Website",
    description: "Delhi High Court portal for case status, listings & orders",
    url: "https://delhihighcourt.nic.in/",
    icon: Building2,
    color: "from-rose-500 to-pink-500",
  },
  {
    title: "NJDG — National Judicial Data Grid",
    description: "Pan-India pendency statistics and court performance data",
    url: "https://njdg.ecourts.gov.in/njdgnew/",
    icon: Shield,
    color: "from-indigo-500 to-blue-500",
  },
];

const levelConfig = {
  supreme: { label: "Supreme Court", icon: Landmark, accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  high: { label: "High Courts", icon: Building2, accent: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400" },
  district: { label: "District Courts", icon: Scale, accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
};

export function AdvocateJudges() {
  const [search, setSearch] = useState("");
  const [expandedCourt, setExpandedCourt] = useState<string | null>("sc");
  const [filterLevel, setFilterLevel] = useState<CourtLevel | "all">("all");
  const [showOnLeaveOnly, setShowOnLeaveOnly] = useState(false);

  const filteredCourts = courts
    .filter(c => filterLevel === "all" || c.level === filterLevel)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.judges.some(j => j.name.toLowerCase().includes(q));
    });

  const totalJudges = courts.reduce((a, c) => a + c.judges.length, 0);
  const onLeaveCount = courts.reduce((a, c) => a + c.judges.filter(j => j.onLeave).length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A2332] mb-1">Judges Roster & eCourt Services</h1>
        <p className="text-[#1A2332]/50 text-sm">Complete roster across all courts · Leave status · eCourt quick links</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-2xl p-4">
          <p className="text-[#1A2332]/30 text-[10px] font-bold uppercase tracking-wider mb-1">Total Courts</p>
          <p className="text-[#1A2332] text-2xl font-bold">{courts.length}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-2xl p-4">
          <p className="text-[#1A2332]/30 text-[10px] font-bold uppercase tracking-wider mb-1">Total Judges</p>
          <p className="text-[#1A2332] text-2xl font-bold">{totalJudges}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-2xl p-4">
          <p className="text-emerald-400/50 text-[10px] font-bold uppercase tracking-wider mb-1">Available Today</p>
          <p className="text-emerald-400 text-2xl font-bold">{totalJudges - onLeaveCount}</p>
        </div>
        <div className="bg-card/40 border border-[#1A2332]/10 rounded-2xl p-4">
          <p className="text-rose-400/50 text-[10px] font-bold uppercase tracking-wider mb-1">On Leave</p>
          <p className="text-rose-400 text-2xl font-bold">{onLeaveCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {ecourtLinks.map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-card/40 border border-[#1A2332]/10 hover:border-[#1A2332]/20 rounded-2xl p-4 transition-all hover:bg-card/60"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0`}>
                <link.icon className="w-5 h-5 text-[#1A2332]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[#1A2332] text-sm font-bold group-hover:text-primary transition-colors">{link.title}</h3>
                  <ExternalLink className="w-3 h-3 text-[#1A2332]/20 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                </div>
                <p className="text-[#1A2332]/40 text-xs mt-0.5 leading-relaxed">{link.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A2332]/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search judge name, court, or location..."
            className="w-full bg-card/50 border border-[#1A2332]/10 rounded-xl pl-11 pr-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/30 focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "supreme", "high", "district"] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${filterLevel === lvl ? "bg-primary/15 border-primary/30 text-primary" : "bg-[#1A2332]/5 border-[#1A2332]/10 text-[#1A2332]/40 hover:text-[#1A2332]/60 hover:bg-[#1A2332]/8"}`}
            >
              {lvl === "all" ? "All Courts" : lvl === "supreme" ? "Supreme Court" : lvl === "high" ? "High Courts" : "District Courts"}
            </button>
          ))}
          <button
            onClick={() => setShowOnLeaveOnly(!showOnLeaveOnly)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${showOnLeaveOnly ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "bg-[#1A2332]/5 border-[#1A2332]/10 text-[#1A2332]/40 hover:text-[#1A2332]/60 hover:bg-[#1A2332]/8"}`}
          >
            <UserX className="w-3.5 h-3.5" />
            On Leave
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredCourts.map((court) => {
          const config = levelConfig[court.level];
          const Icon = config.icon;
          const isExpanded = expandedCourt === court.id;
          const courtJudges = showOnLeaveOnly ? court.judges.filter(j => j.onLeave) : court.judges;
          const leaveCount = court.judges.filter(j => j.onLeave).length;

          if (showOnLeaveOnly && courtJudges.length === 0) return null;

          return (
            <motion.div
              key={court.id}
              layout
              className={`bg-card/40 border rounded-2xl overflow-hidden transition-all ${isExpanded ? "border-white/15" : "border-[#1A2332]/8"}`}
            >
              <button
                onClick={() => setExpandedCourt(isExpanded ? null : court.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-[#1A2332]/5 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[#1A2332] font-bold text-sm truncate">{court.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.bg} border ${config.border} ${config.accent} font-bold`}>
                      {court.level === "supreme" ? "SC" : court.level === "high" ? "HC" : "DC"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[#1A2332]/40 text-xs">{court.location}</span>
                    <span className="text-[#1A2332]/25 text-xs">·</span>
                    <span className="flex items-center gap-1 text-[#1A2332]/40 text-xs">
                      <UserCheck className="w-3 h-3 text-emerald-400" /> {court.judges.length - leaveCount}
                    </span>
                    {leaveCount > 0 && (
                      <>
                        <span className="text-[#1A2332]/25 text-xs">·</span>
                        <span className="flex items-center gap-1 text-rose-400 text-xs">
                          <UserX className="w-3 h-3" /> {leaveCount} on leave
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-[#1A2332]/25 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#1A2332]/8 px-5 py-3">
                      <div className="grid gap-2">
                        {courtJudges.map((judge, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${judge.onLeave ? "bg-rose-500/5 border border-rose-500/10" : "bg-[#1A2332]/5 border border-white/5"}`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${judge.onLeave ? "bg-rose-400" : "bg-emerald-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${judge.onLeave ? "text-[#1A2332]/50" : "text-[#1A2332]/80"}`}>{judge.name}</p>
                                {judge.designation.includes("Chief") && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">CJ</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[#1A2332]/30 text-xs">{judge.designation}</span>
                                {judge.bench && (
                                  <>
                                    <span className="text-[#1A2332]/15 text-xs">·</span>
                                    <span className="text-[#1A2332]/25 text-xs">{judge.bench}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {judge.onLeave ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-rose-400 text-[10px] font-bold">
                                    <AlertCircle className="w-3 h-3" /> ON LEAVE
                                  </div>
                                  <p className="text-[#1A2332]/25 text-[10px] mt-0.5">Until {judge.leaveUntil} · {judge.leaveReason}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-400/60 text-[10px] font-bold flex-shrink-0">AVAILABLE</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
