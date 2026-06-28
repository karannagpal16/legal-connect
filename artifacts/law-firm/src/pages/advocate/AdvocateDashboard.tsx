import { Gavel, BookOpen, Video, Briefcase, Bell, BarChart3, Scale, Clock, Users, CheckCircle, ArrowRight, TrendingUp, ChevronRight, Star, Phone, IndianRupee } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListCases, useListBookings } from "@workspace/api-client-react";

const sections = [
  {
    title: "My Case Diary",
    desc: "Hearing dates, court schedule & case management",
    icon: BookOpen,
    href: "/advocate/diary",
    color: "text-amber-400",
    gradient: "from-amber-500/25 to-amber-600/5",
    border: "border-amber-500/35",
    badge: "Primary",
  },
  {
    title: "Client Calls",
    desc: "Accept live audio & video calls from clients",
    icon: Video,
    href: "/advocate/calls",
    color: "text-blue-400",
    gradient: "from-blue-500/25 to-blue-600/5",
    border: "border-blue-500/35",
    badge: "Live",
  },
  {
    title: "Proxy Hub",
    desc: "Post or accept proxy appearances & filing",
    icon: Briefcase,
    href: "/advocate/proxy",
    color: "text-violet-400",
    gradient: "from-violet-500/25 to-violet-600/5",
    border: "border-violet-500/35",
    badge: "Network",
  },
  {
    title: "LawBot Research",
    desc: "Source-restricted Indian legal research with citations",
    icon: Scale,
    href: "/advocate/lawbot",
    color: "text-emerald-400",
    gradient: "from-emerald-500/25 to-emerald-600/5",
    border: "border-emerald-500/35",
    badge: "Cited",
  },
  {
    title: "Case Reminders",
    desc: "Hearing alerts, deadlines & notifications",
    icon: Bell,
    href: "/advocate/reminders",
    color: "text-rose-400",
    gradient: "from-rose-500/25 to-rose-600/5",
    border: "border-rose-500/35",
    badge: "Alerts",
  },
];

const upcoming = [
  { title: "Sharma vs. Delhi Transport Corp", court: "Delhi High Court, Ct. 7", time: "10:30 AM", date: "Today", urgency: "high" },
  { title: "Gupta Divorce Petition", court: "Family Court, Rohini", time: "2:00 PM", date: "Today", urgency: "medium" },
  { title: "Mehra Property Dispute", court: "Delhi High Court, Ct. 12", time: "11:00 AM", date: "Apr 5", urgency: "low" },
];

export function AdvocateDashboard() {
  const { data: cases = [] } = useListCases();
  const { data: bookings = [] } = useListBookings();

  const activeCases = cases.filter(c => c.status === "Active").length;
  const pendingBookings = bookings.filter(b => b.status === "Pending").length;
  const todayHearings = cases.filter(c => {
    if (!c.nextDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return c.nextDate.startsWith(today);
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-amber-500/8 to-transparent border border-amber-500/30 rounded-3xl p-7"
      >
        <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold">Active · Available</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#1A2332] mb-1">Welcome, Advocate</h1>
            <p className="text-[#1A2332]/50 text-sm">
              <span className="text-amber-400 font-semibold">{todayHearings || 2} hearings</span> today ·
              <span className="text-[#1A2332] font-semibold ml-1">{activeCases || 12} active cases</span> ·
              <span className="text-rose-400 font-semibold ml-1">{pendingBookings || 3} new requests</span>
            </p>
          </div>
          <Link href="/advocate/calls">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-background px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-amber-500/30 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              Client Calls
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Cases", value: activeCases || 12, icon: Scale, color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/8" },
          { label: "Today's Hearings", value: todayHearings || 2, icon: Clock, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-500/8" },
          { label: "New Bookings", value: pendingBookings || 3, icon: Bell, color: "text-rose-400", bg: "border-rose-500/20 bg-rose-500/8", badge: "action" },
          { label: "Cases Resolved", value: cases.length || 48, icon: CheckCircle, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/8" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className={`border rounded-2xl p-5 flex flex-col items-center text-center ${stat.bg}`}
          >
            <stat.icon className={`w-6 h-6 mb-3 ${stat.color}`} />
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-bold text-[#1A2332]">{stat.value}</span>
              {(stat as any).badge === "action" && stat.value > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              )}
            </div>
            <span className="text-xs text-[#1A2332]/40 uppercase tracking-wider mt-1">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Today's Schedule */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1A2332]/30 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Upcoming Hearings
          </h2>
          <Link href="/advocate/diary">
            <span className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1 transition-colors">
              Open Diary <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        <div className="space-y-2.5">
          {upcoming.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32 + 0.07 * i }}
              className={`flex items-center gap-4 rounded-2xl px-5 py-4 border transition-all cursor-pointer group ${
                h.urgency === "high"
                  ? "border-rose-500/25 bg-rose-500/8 hover:border-rose-500/40"
                  : h.urgency === "medium"
                  ? "border-amber-500/20 bg-amber-500/6 hover:border-amber-500/35"
                  : "border-[#1A2332]/8 bg-[#1A2332]/5 hover:border-white/15"
              }`}
            >
              <div className={`text-center min-w-[52px] ${h.urgency === "high" ? "text-rose-400" : h.urgency === "medium" ? "text-amber-400" : "text-[#1A2332]/40"}`}>
                <div className="text-[11px] font-bold uppercase">{h.date}</div>
                <div className="text-sm font-bold">{h.time}</div>
              </div>
              <div className="w-px h-8 bg-[#1A2332]/10 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[#1A2332] text-sm font-semibold truncate">{h.title}</p>
                <p className="text-[#1A2332]/35 text-xs mt-0.5">{h.court}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#1A2332]/20 group-hover:text-[#1A2332]/50 transition-colors" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Practice Sections */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1A2332]/30 mb-4">Practice Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 0.1 * i }}
            >
              <Link href={s.href}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className={`group relative overflow-hidden bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl p-5 cursor-pointer transition-colors`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1A2332]/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-[#1A2332]/10 text-[#1A2332]/50`}>{s.badge}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#1A2332] mb-1">{s.title}</h3>
                  <p className="text-[#1A2332]/45 text-xs leading-relaxed mb-3">{s.desc}</p>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${s.color} group-hover:gap-2.5 transition-all`}>
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { title: "Bookings", href: "/advocate/bookings", icon: Users, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-500/8" },
          { title: "Revenue", href: "/advocate/revenue", icon: IndianRupee, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/8" },
          { title: "Library", href: "/advocate/library", icon: BookOpen, color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/8" },
        ].map((item) => (
          <Link key={item.title} href={item.href}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              className={`border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${item.bg}`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[#1A2332] text-xs font-bold">{item.title}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
