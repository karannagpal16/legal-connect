import { Link } from "wouter";
import { Scale, Shield, Gavel, BookMarked, ArrowRight, Star, Users, CheckCircle, Zap, MessageCircle, FileText, BookOpen } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function CountUp({ to, duration = 1.5 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return <span ref={ref}>{val.toLocaleString()}</span>;
}

const marqueeItems = [
  "⚖️  Delhi High Court",
  "🏛️  Supreme Court Practice",
  "📋  Criminal Law",
  "🏠  Property Disputes",
  "👨‍👩‍👧  Family Law",
  "💼  Corporate Law",
  "🛒  Consumer Protection",
  "📄  Contract Drafting",
  "🔒  NDA & IP",
  "🚗  Motor Accident Claims",
];

const portals = [
  {
    role: "Client",
    href: "/client",
    icon: Shield,
    gradient: "from-blue-600/30 via-blue-500/10 to-transparent",
    glow: "shadow-blue-500/20",
    border: "border-blue-500/40",
    accent: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    hoverBorder: "hover:border-blue-400/60",
    features: ["Book an advocate in 60 seconds", "Video & audio consultations", "DIY document drafting", "AI legal assistant"],
    cta: "Enter Client Portal",
    tagline: "Your legal rights, protected.",
  },
  {
    role: "Advocate",
    href: "/advocate",
    icon: Gavel,
    gradient: "from-amber-600/30 via-amber-500/10 to-transparent",
    glow: "shadow-amber-500/20",
    border: "border-amber-500/40",
    accent: "text-amber-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    hoverBorder: "hover:border-amber-400/60",
    features: ["Digital case diary", "Client call management", "Proxy hub", "Revenue analytics"],
    cta: "Enter Advocate Portal",
    tagline: "Practice smarter, not harder.",
  },
  {
    role: "Intern",
    href: "/intern",
    icon: BookMarked,
    gradient: "from-emerald-600/30 via-emerald-500/10 to-transparent",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/40",
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    hoverBorder: "hover:border-emerald-400/60",
    features: ["XP & leveling system", "Leaderboard & badges", "Doubt Q&A portal", "AI learning assistant"],
    cta: "Enter Intern Portal",
    tagline: "Level up your legal career.",
  },
];

const stats = [
  { label: "Cases Handled", value: 2400, suffix: "+" },
  { label: "Advocates", value: 48, suffix: "" },
  { label: "Happy Clients", value: 1800, suffix: "+" },
  { label: "Years of Practice", value: 8, suffix: "" },
];

const features = [
  { icon: Zap, label: "Instant Matching", desc: "Uber-style advocate booking" },
  { icon: MessageCircle, label: "AI Legal Chat", desc: "Ask anything, get real answers" },
  { icon: FileText, label: "DIY Documents", desc: "Draft legal docs in minutes" },
  { icon: BookOpen, label: "Law Made Simple", desc: "Plain-language legal guides" },
  { icon: Star, label: "Earn XP & Badges", desc: "Gamified intern learning" },
  { icon: Users, label: "Expert Advocates", desc: "Delhi HC & Supreme Court" },
];

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[300px] rounded-full bg-emerald-500/4 blur-[120px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <Scale className="w-8 h-8 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            </div>
            <div>
              <span className="font-serif font-bold text-xl text-white tracking-wide">
                Rishika Nagpal & Associates
              </span>
              <div className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold">
                Legal Connect App
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex items-center gap-6 text-sm"
          >
            <span className="flex items-center gap-2 text-white/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Delhi HC & Supreme Court
            </span>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-20 relative">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/25 text-primary mb-10 shadow-lg shadow-primary/10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">India's Premier Legal Connect Platform</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-serif font-bold tracking-tight text-white mb-6 leading-[1.05]">
              Justice{" "}
              <span className="relative inline-block">
                <span className="text-primary">Within Reach.</span>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-full origin-left"
                />
              </span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
              One platform for clients seeking justice, advocates managing practice, and interns building a career — powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link href="/client">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-background px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 transition-all"
                >
                  <Shield className="w-5 h-5" />
                  I Need Legal Help
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/advocate">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all backdrop-blur-sm"
                >
                  <Gavel className="w-5 h-5" />
                  I'm an Advocate
                </motion.button>
              </Link>
            </div>
            <p className="text-white/25 text-xs">No sign-up required to explore</p>
          </motion.div>
        </div>

        {/* Scrolling Marquee */}
        <div className="border-y border-white/8 bg-white/3 py-4 overflow-hidden mb-20">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex gap-10 whitespace-nowrap"
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="text-white/30 text-sm font-medium">{item}</span>
            ))}
          </motion.div>
        </div>

        {/* Stats Strip */}
        <div className="max-w-5xl mx-auto px-6 mb-28">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-serif font-bold text-white mb-1">
                  <CountUp to={s.value} />
                  <span className="text-primary">{s.suffix}</span>
                </div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Portal Cards */}
        <div className="max-w-6xl mx-auto px-6 mb-28">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Choose Your Portal</h2>
            <p className="text-white/40">Three portals, one powerful platform.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {portals.map((portal, i) => (
              <motion.div
                key={portal.role}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 * i }}
              >
                <Link href={portal.href}>
                  <motion.div
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className={`group relative bg-card/40 backdrop-blur-xl border ${portal.border} ${portal.hoverBorder} rounded-3xl p-8 cursor-pointer transition-colors duration-300 shadow-2xl ${portal.glow} flex flex-col h-full overflow-hidden`}
                  >
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-6">
                        <div className={`w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <portal.icon className={`w-7 h-7 ${portal.accent}`} strokeWidth={1.5} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${portal.badgeBg}`}>
                          {portal.role}
                        </span>
                      </div>

                      <p className={`text-xs font-semibold uppercase tracking-wider ${portal.accent} mb-2 opacity-70`}>{portal.tagline}</p>
                      <h2 className="text-2xl font-serif font-bold text-white mb-5">{portal.role} Portal</h2>

                      <ul className="space-y-2.5 mb-8 flex-1">
                        {portal.features.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                            <CheckCircle className={`w-4 h-4 ${portal.accent} flex-shrink-0`} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className={`flex items-center gap-2 text-sm font-bold ${portal.accent} group-hover:gap-3 transition-all mt-auto`}>
                        {portal.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="max-w-6xl mx-auto px-6 mb-28">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Everything You Need</h2>
            <p className="text-white/40">Built for every stakeholder in the legal system.</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i }}
                whileHover={{ scale: 1.03 }}
                className="bg-card/30 border border-white/8 hover:border-white/20 rounded-2xl p-5 transition-all cursor-default"
              >
                <f.icon className="w-7 h-7 text-primary mb-3" strokeWidth={1.5} />
                <h3 className="text-white font-bold mb-1">{f.label}</h3>
                <p className="text-white/40 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-blue-500/10 border border-primary/30 rounded-3xl p-10 sm:p-14 text-center"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[80px] rounded-full" />
            </div>
            <div className="relative z-10">
              <Scale className="w-10 h-10 text-primary mx-auto mb-5" strokeWidth={1.5} />
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">
                Don't face legal issues alone.
              </h2>
              <p className="text-white/50 mb-8 text-lg max-w-xl mx-auto">
                Connect with an experienced advocate from Rishika Nagpal & Associates in under 60 seconds.
              </p>
              <Link href="/client/book">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-background px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 transition-all"
                >
                  <Gavel className="w-5 h-5" />
                  Book a Consultation
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/8 py-10">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/25 text-xs">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary/40" />
              <span>Rishika Nagpal & Associates · New Delhi · Est. 2018</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Delhi High Court</span>
              <span>Supreme Court of India</span>
              <span>Bar Council of Delhi</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
