import { Link } from "wouter";
import { Phone, Bell, Library, ArrowRight, Shield, Scale, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Phone,
    title: "Book an Advocate",
    desc: "Connect with a qualified advocate in seconds via audio or video call.",
    href: "/client/book",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    cta: "Book Now",
  },
  {
    icon: Bell,
    title: "Case Reminders",
    desc: "Never miss a hearing date. Get smart reminders for all your active cases.",
    href: "/client/reminders",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    cta: "View Reminders",
  },
  {
    icon: Library,
    title: "Legal Library",
    desc: "Access landmark judgements, bare acts, and legal references instantly.",
    href: "/client/library",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    cta: "Browse Library",
  },
];

const stats = [
  { label: "Cases Tracked", value: "3", icon: Scale },
  { label: "Next Hearing", value: "Apr 4", icon: Clock },
  { label: "Resolved", value: "1", icon: CheckCircle },
];

export function ClientHome() {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-serif font-bold text-white">Welcome back, Client</h1>
        </div>
        <p className="text-white/50 ml-10">Here's a snapshot of your legal matters.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="bg-card/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center"
          >
            <stat.icon className="w-6 h-6 text-blue-400 mb-3" />
            <span className="text-3xl font-bold text-white mb-1">{stat.value}</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">What do you need today?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i + 0.2 }}
            >
              <Link href={f.href}>
                <div className={`group border rounded-2xl p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${f.bg}`}>
                  <f.icon className={`w-8 h-8 mb-4 ${f.color}`} />
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-white/50 text-sm mb-5 leading-relaxed">{f.desc}</p>
                  <div className={`flex items-center gap-2 text-sm font-bold ${f.color} group-hover:gap-3 transition-all`}>
                    {f.cta} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA to book */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div>
          <h3 className="text-xl font-serif font-bold text-white mb-1">Need legal help right now?</h3>
          <p className="text-white/50 text-sm">Get connected to an advocate in under 60 seconds.</p>
        </div>
        <Link href="/client/book">
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-7 py-3.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-blue-500/30 whitespace-nowrap">
            <Phone className="w-5 h-5" />
            Book an Advocate
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
