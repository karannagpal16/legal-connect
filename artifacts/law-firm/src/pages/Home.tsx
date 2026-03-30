import { Link } from "wouter";
import { Scale, Shield, Gavel, BookMarked, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const portals = [
  {
    role: "Client",
    href: "/client",
    icon: Shield,
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/30",
    accent: "text-blue-400",
    bg: "hover:bg-blue-500/10",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description: "Book advocates, track your cases, and connect with your legal team instantly.",
    cta: "Enter Client Portal",
  },
  {
    role: "Advocate",
    href: "/advocate",
    icon: Gavel,
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/30",
    accent: "text-amber-400",
    bg: "hover:bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    description: "Manage your diary, proxy appearances, client calls, and legal practice.",
    cta: "Enter Advocate Portal",
  },
  {
    role: "Intern",
    href: "/intern",
    icon: BookMarked,
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    bg: "hover:bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "Complete quests, earn XP, level up your skills, and learn from senior advocates.",
    cta: "Enter Intern Portal",
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl leading-tight text-white tracking-wide">
                Rishika Nagpal & Associates
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                Legal Connect App
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Delhi High Court & Supreme Court Practice
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 pt-20">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                India's Premier Legal Connect Platform
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white mb-6 leading-[1.1]">
              Integrity in <span className="text-primary">Legal Practice.</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-16 leading-relaxed">
              A unified legal platform connecting clients, advocates, and interns — 
              built for speed, transparency, and excellence in the courtroom.
            </p>
          </motion.div>

          {/* Three Portal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {portals.map((portal, i) => (
              <motion.div
                key={portal.role}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 * i }}
              >
                <Link href={portal.href}>
                  <div className={`group relative bg-card/40 backdrop-blur-xl border ${portal.border} rounded-3xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl bg-gradient-to-b ${portal.color} ${portal.bg} flex flex-col items-start text-left h-full`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-6 ${portal.badge}`}>
                      {portal.role}
                    </div>

                    <portal.icon className={`w-12 h-12 mb-4 ${portal.accent}`} strokeWidth={1.5} />

                    <h2 className={`text-2xl font-serif font-bold mb-3 text-white`}>
                      {portal.role} Portal
                    </h2>

                    <p className="text-white/60 text-sm leading-relaxed mb-8 flex-1">
                      {portal.description}
                    </p>

                    <div className={`flex items-center gap-2 text-sm font-bold ${portal.accent} group-hover:gap-3 transition-all`}>
                      {portal.cta}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-16 text-white/30 text-xs uppercase tracking-widest"
          >
            Rishika Nagpal & Associates · New Delhi · Est. 2018
          </motion.p>
        </div>
      </main>
    </div>
  );
}
