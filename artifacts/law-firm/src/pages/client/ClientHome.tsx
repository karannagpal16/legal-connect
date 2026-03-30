import { Link } from "wouter";
import { Phone, Bell, Library, ArrowRight, Shield, Scale, Clock, CheckCircle, Sparkles, BookOpen, Pen, Zap, AlertCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const quickActions = [
  {
    icon: Phone,
    title: "Book an Advocate",
    desc: "Get connected in under 60 seconds",
    href: "/client/book",
    color: "text-blue-400",
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500/30 to-blue-600/5",
    border: "border-blue-500/40",
    cta: "Book Now",
    badge: "MOST USED",
    badgeColor: "bg-blue-500/20 text-blue-300",
  },
  {
    icon: Sparkles,
    title: "AI Legal Assistant",
    desc: "Ask any question, get instant guidance",
    href: "/client/ai-assistant",
    color: "text-violet-400",
    glow: "shadow-violet-500/20",
    gradient: "from-violet-500/30 to-violet-600/5",
    border: "border-violet-500/40",
    cta: "Ask LexBot",
    badge: "AI POWERED",
    badgeColor: "bg-violet-500/20 text-violet-300",
  },
  {
    icon: Pen,
    title: "DIY Documents",
    desc: "Draft rent agreements, notices & more",
    href: "/client/diy-docs",
    color: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    gradient: "from-emerald-500/30 to-emerald-600/5",
    border: "border-emerald-500/40",
    cta: "Create Doc",
    badge: "FREE",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
  },
];

const moreFeatures = [
  { icon: Bell, title: "Case Reminders", desc: "Never miss a hearing", href: "/client/reminders", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { icon: BookOpen, title: "Law Made Simple", desc: "Know your rights", href: "/client/legal-guide", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Library, title: "Legal Library", desc: "Acts, judgements & more", href: "/client/library", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
];

const activeCases = [
  { title: "Tenancy Dispute – Rohini Property", date: "Apr 4, 2026", urgency: "high", type: "Property Law" },
  { title: "Consumer Complaint – XYZ Electronics", date: "Apr 12, 2026", urgency: "medium", type: "Consumer" },
  { title: "Employment Settlement", date: "Apr 28, 2026", urgency: "low", type: "Labour Law" },
];

const urgencyConfig = {
  high: { label: "Hearing Soon", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", dot: "bg-rose-400" },
  medium: { label: "Upcoming", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
  low: { label: "Scheduled", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
};

export function ClientHome() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 via-blue-500/8 to-transparent border border-blue-500/25 rounded-3xl p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-400 text-sm font-semibold mb-1">{greeting} 👋</p>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Welcome back, Client</h1>
            <p className="text-white/50 text-sm">You have <span className="text-white font-semibold">3 active cases</span> · Next hearing <span className="text-amber-400 font-semibold">Apr 4</span></p>
          </div>
          <Link href="/client/book">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/30 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              Book Now
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Quick Actions — Big 3 */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <Link href={f.href}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className={`group relative overflow-hidden bg-gradient-to-br ${f.gradient} border ${f.border} rounded-2xl p-6 cursor-pointer shadow-xl ${f.glow} transition-all`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <f.icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${f.badgeColor}`}>{f.badge}</span>
                  </div>
                  <h3 className="text-white font-bold text-base mb-1">{f.title}</h3>
                  <p className="text-white/45 text-xs mb-5 leading-relaxed">{f.desc}</p>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${f.color} group-hover:gap-2.5 transition-all`}>
                    {f.cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Your Active Cases</h2>
          <Link href="/client/reminders">
            <span className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        <div className="space-y-3">
          {activeCases.map((c, i) => {
            const u = urgencyConfig[c.urgency as keyof typeof urgencyConfig];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + 0.08 * i }}
                className="flex items-center gap-4 bg-card/40 border border-white/8 hover:border-white/15 rounded-2xl px-5 py-4 cursor-pointer transition-all group"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${u.dot} animate-pulse`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.title}</p>
                  <p className="text-white/35 text-xs mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Next: {c.date} · {c.type}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${u.bg} ${u.color}`}>
                  {u.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* More features row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">More Tools</h2>
        <div className="grid grid-cols-3 gap-3">
          {moreFeatures.map((f) => (
            <Link key={f.title} href={f.href}>
              <div className={`group border rounded-2xl p-4 cursor-pointer hover:-translate-y-1 transition-all duration-300 ${f.bg}`}>
                <f.icon className={`w-6 h-6 mb-3 ${f.color}`} />
                <p className="text-white text-sm font-bold mb-0.5">{f.title}</p>
                <p className="text-white/35 text-xs">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Emergency help banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-400 font-bold text-sm">Arrested or in police custody?</p>
            <p className="text-white/45 text-xs mt-0.5">You have the right to legal representation. Connect with an advocate immediately.</p>
          </div>
        </div>
        <Link href="/client/book">
          <button className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap">
            <Zap className="w-4 h-4" /> Urgent Help
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
