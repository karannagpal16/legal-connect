import { Gavel, BookOpen, Video, Briefcase, Bell, BarChart3, Scale, Clock, Users, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListCases, useListBookings } from "@workspace/api-client-react";

const sections = [
  {
    title: "My Diary",
    desc: "Case management, hearing dates, and court schedule.",
    icon: BookOpen,
    href: "/advocate/diary",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Client Calls",
    desc: "Accept incoming audio/video call requests from clients.",
    icon: Video,
    href: "/advocate/calls",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Proxy Hub",
    desc: "Post or accept proxy appearances and filing tasks.",
    icon: Briefcase,
    href: "/advocate/proxy",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    title: "Case Reminders",
    desc: "Manage hearing alerts and deadline notifications.",
    icon: Bell,
    href: "/advocate/reminders",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
];

export function AdvocateDashboard() {
  const { data: cases = [] } = useListCases();
  const { data: bookings = [] } = useListBookings();

  const activeCases = cases.filter(c => c.status === "Active").length;
  const pendingBookings = bookings.filter(b => b.status === "Pending").length;
  const todayHearings = cases.filter(c => {
    if (!c.nextHearingDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return c.nextHearingDate.startsWith(today);
  }).length;

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Gavel className="w-7 h-7 text-amber-400" />
          <h1 className="text-3xl font-serif font-bold text-white">Advocate Dashboard</h1>
        </div>
        <p className="text-white/40 ml-10">Your practice at a glance, Rishika.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Cases", value: activeCases, icon: Scale, color: "text-amber-400" },
          { label: "Today's Hearings", value: todayHearings, icon: Clock, color: "text-blue-400" },
          { label: "Pending Bookings", value: pendingBookings, icon: Bell, color: "text-rose-400" },
          { label: "Cases Handled", value: cases.length, icon: CheckCircle, color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="bg-card/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center"
          >
            <stat.icon className={`w-6 h-6 mb-3 ${stat.color}`} />
            <span className="text-3xl font-bold text-white mb-1">{stat.value}</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Practice Sections */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Practice Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i + 0.2 }}
            >
              <Link href={s.href}>
                <div className={`group border rounded-2xl p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${s.bg}`}>
                  <s.icon className={`w-8 h-8 mb-3 ${s.color}`} />
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-white/50 text-sm">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick access to admin functions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Client Bookings", href: "/advocate/bookings", icon: Users, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-500/5" },
          { title: "Revenue Tracker", href: "/advocate/revenue", icon: BarChart3, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5" },
          { title: "Legal Library", href: "/advocate/library", icon: BookOpen, color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/5" },
        ].map((item, i) => (
          <Link key={item.title} href={item.href}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + 0.1 * i }}
              className={`border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:-translate-y-0.5 transition-all ${item.bg}`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-white text-sm font-semibold">{item.title}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
