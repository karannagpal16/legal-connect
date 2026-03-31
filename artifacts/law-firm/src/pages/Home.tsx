import { Link } from "wouter";
import { Scale, Shield, Gavel, BookMarked, ArrowRight, CheckCircle, Zap, MessageCircle, FileText, BookOpen, ExternalLink, ChevronRight, Sparkles, TrendingUp, Bell, Lock } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/* ── animated counter ── */
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

/* ── data ── */
const marqueeItems = [
  "⚖️  Delhi High Court", "🏛️  Supreme Court Practice", "📋  Criminal Law",
  "🏠  Property Disputes", "👨‍👩‍👧  Family Law", "💼  Corporate Law",
  "🛒  Consumer Protection", "📄  Contract Drafting", "🔒  NDA & IP", "🚗  Motor Accident Claims",
];

const portals = [
  {
    role: "Client", href: "/client", icon: Shield,
    gradient: "from-blue-600/30 via-blue-500/10 to-transparent",
    glow: "shadow-blue-500/20", border: "border-blue-500/40", accent: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    features: ["Book an advocate in 60 seconds", "Video & audio consultations", "DIY document drafting", "Encrypted advocate chat", "AI legal assistant"],
    cta: "Enter Client Portal", tagline: "Your legal rights, protected.",
  },
  {
    role: "Advocate", href: "/advocate", icon: Gavel,
    gradient: "from-amber-600/30 via-amber-500/10 to-transparent",
    glow: "shadow-amber-500/20", border: "border-amber-500/40", accent: "text-amber-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    features: ["Digital case diary", "Client call management", "Encrypted client chat", "Consultation bookings & rates", "Revenue analytics"],
    cta: "Enter Advocate Portal", tagline: "Practice smarter, not harder.",
  },
  {
    role: "Intern", href: "/intern", icon: BookMarked,
    gradient: "from-emerald-600/30 via-emerald-500/10 to-transparent",
    glow: "shadow-emerald-500/20", border: "border-emerald-500/40", accent: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    features: ["XP & leveling system", "Leaderboard & badges", "Doubt Q&A portal", "AI learning assistant", "Daily challenges"],
    cta: "Enter Intern Portal", tagline: "Level up your legal career.",
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
  { icon: Lock, label: "Encrypted Chat", desc: "E2E encrypted client–advocate messaging" },
  { icon: FileText, label: "DIY Documents", desc: "Draft legal docs in minutes" },
  { icon: MessageCircle, label: "AI Legal Chat", desc: "Ask anything, get real answers" },
  { icon: BookOpen, label: "Law Made Simple", desc: "Plain-language legal guides" },
  { icon: TrendingUp, label: "Earn XP & Badges", desc: "Gamified intern learning" },
];

const judgements = [
  {
    title: "State of Maharashtra v. Vijay Mohan Jadhav",
    court: "Supreme Court of India",
    bench: "J. D.Y. Chandrachud, J. J.B. Pardiwala",
    date: "Mar 28, 2026",
    citation: "2026 SCC 412",
    category: "Criminal",
    categoryColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    summary: "Held that confession recorded by a police officer is inadmissible under Section 25 of the Indian Evidence Act even if made voluntarily. The court emphasized that the fundamental right against self-incrimination under Article 20(3) acts as a constitutional shield for the accused.",
    headnote: "Police confession · Art. 20(3) · Inadmissibility",
  },
  {
    title: "Ramesh Kumar v. Union of India & Ors.",
    court: "Delhi High Court",
    bench: "J. Prathiba M. Singh",
    date: "Mar 25, 2026",
    citation: "2026 DHC 189",
    category: "Property",
    categoryColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    summary: "The court held that a tenant cannot be evicted without due process merely on the basis of an expired rent agreement. Landlord must approach the Rent Controller and obtain a formal eviction order. Immediate eviction notices served without legal process were quashed.",
    headnote: "Tenant eviction · Rent Controller · Due process",
  },
  {
    title: "XYZ Pvt. Ltd. v. National Consumer Disputes Redressal Commission",
    court: "Supreme Court of India",
    bench: "J. Sanjiv Khanna, J. Sanjay Kumar",
    date: "Mar 20, 2026",
    citation: "2026 SCC 388",
    category: "Consumer",
    categoryColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    summary: "Supreme Court expanded the definition of 'deficiency in service' under the Consumer Protection Act 2019 to include digital services. E-commerce platforms cannot disclaim liability for defective products sold by third-party sellers on their platform.",
    headnote: "Consumer protection · E-commerce · Third-party liability",
  },
  {
    title: "Seema Mishra v. Sanjay Mishra",
    court: "Delhi High Court",
    bench: "J. Rekha Palli",
    date: "Mar 15, 2026",
    citation: "2026 DHC 175",
    category: "Family",
    categoryColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    summary: "Interim maintenance awarded at ₹35,000/month pending divorce proceedings. Court held that a wife's educational qualifications do not automatically disentitle her from maintenance — financial dependency is a matter of fact, not presumption.",
    headnote: "Interim maintenance · Financial dependency · Divorce",
  },
  {
    title: "Aryan Industries v. State of Haryana",
    court: "Punjab & Haryana High Court",
    bench: "J. G.S. Sandhawalia, J. H.S. Madaan",
    date: "Mar 10, 2026",
    citation: "2026 PHC 204",
    category: "Corporate",
    categoryColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    summary: "An unregistered partnership firm can still pursue legal remedies for breach of contract provided the partnership's existence can be proven by other documentary evidence. Court distinguished between enforcing partnership rights vs. breach of contract claims.",
    headnote: "Unregistered firm · Contract enforcement · Partnership Act",
  },
  {
    title: "Pooja Chawla v. HDFC Bank Ltd.",
    court: "National Consumer Forum",
    bench: "Presiding Officer A.K. Sharma",
    date: "Mar 5, 2026",
    citation: "2026 NCDRC 91",
    category: "Banking",
    categoryColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    summary: "Bank held liable for deficiency of service for debiting EMIs after loan foreclosure. The forum directed refund of all wrongly debited amounts with 9% interest p.a., along with ₹50,000 compensation for mental agony and ₹10,000 litigation costs.",
    headnote: "Loan foreclosure · Wrongful debit · Bank liability",
  },
];

const legalTips = [
  "Always get a written acknowledgment when submitting documents to any government office.",
  "A FIR can be filed at any police station — not just the one in whose jurisdiction the offence occurred (Zero FIR).",
  "You have the right to a free copy of the FIR if you are the victim or informant.",
  "An oral will (Nuncupative will) is valid in India only for soldiers, airmen, and mariners during active duty.",
  "Your employer must give you a payslip every month — it is your right under labour law.",
  "You can challenge a cheque bounce case even after conviction within 30 days of the judgment.",
  "A minor cannot enter into a contract — any contract with a minor is void from the beginning.",
  "Right to Information (RTI) applications must be replied to within 30 days by government authorities.",
];

const liveActivity = [
  { text: "New consultation booked · Criminal law", time: "2 min ago", color: "text-blue-400" },
  { text: "Judgement added · Supreme Court 2026", time: "8 min ago", color: "text-amber-400" },
  { text: "Client connected with Adv. Rishika Nagpal", time: "15 min ago", color: "text-emerald-400" },
  { text: "Intern Aanya earned 'Criminal Law' badge", time: "22 min ago", color: "text-violet-400" },
  { text: "Legal notice drafted · Consumer complaint", time: "35 min ago", color: "text-rose-400" },
];

/* ── component ── */
export function Home() {
  const [expandedJ, setExpandedJ] = useState<number | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [activityIdx, setActivityIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % legalTips.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActivityIdx(i => (i + 1) % liveActivity.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[300px] rounded-full bg-emerald-500/4 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="relative">
              <Scale className="w-8 h-8 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            </div>
            <div>
              <span className="font-serif font-bold text-xl text-white tracking-wide">Rishika Nagpal & Associates</span>
              <div className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold">Legal Connect App</div>
            </div>
          </motion.div>
          {/* Live activity ticker */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activityIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="hidden md:flex items-center gap-2 text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className={`${liveActivity[activityIdx].color} font-semibold`}>{liveActivity[activityIdx].text}</span>
              <span className="text-white/25">{liveActivity[activityIdx].time}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </nav>

      <main className="pt-20 relative">
        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/25 text-primary mb-10 shadow-lg shadow-primary/10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">India's Premier Legal Connect Platform</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-serif font-bold tracking-tight text-white mb-6 leading-[1.05]">
              Justice{" "}
              <span className="relative inline-block">
                <span className="text-primary">Within Reach.</span>
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-full origin-left" />
              </span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
              One platform for clients seeking justice, advocates managing practice, and interns building a career — powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link href="/client">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-background px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 transition-all">
                  <Shield className="w-5 h-5" /> I Need Legal Help <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/advocate">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all backdrop-blur-sm">
                  <Gavel className="w-5 h-5" /> I'm an Advocate
                </motion.button>
              </Link>
            </div>
            <p className="text-white/25 text-xs">No sign-up required to explore</p>
          </motion.div>
        </div>

        {/* Marquee */}
        <div className="border-y border-white/8 bg-white/3 py-4 overflow-hidden mb-20">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="flex gap-10 whitespace-nowrap">
            {[...marqueeItems, ...marqueeItems].map((item, i) => <span key={i} className="text-white/30 text-sm font-medium">{item}</span>)}
          </motion.div>
        </div>

        {/* Stats */}
        <div className="max-w-5xl mx-auto px-6 mb-28">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }} className="text-center">
                <div className="text-4xl sm:text-5xl font-serif font-bold text-white mb-1"><CountUp to={s.value} /><span className="text-primary">{s.suffix}</span></div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legal Tip of the Day */}
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-primary/8 to-transparent border border-primary/25 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">⚡ Legal Tip of the Day</p>
              <AnimatePresence mode="wait">
                <motion.p key={tipIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-white/80 text-base leading-relaxed">
                  {legalTips[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex gap-1 flex-shrink-0 mt-1">
              {legalTips.map((_, i) => (
                <button key={i} onClick={() => setTipIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === tipIndex ? "bg-primary" : "bg-white/20"}`} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Portal Cards */}
        <div className="max-w-6xl mx-auto px-6 mb-28">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Choose Your Portal</h2>
            <p className="text-white/40">Three portals, one powerful platform.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {portals.map((portal, i) => (
              <motion.div key={portal.role} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 * i }}>
                <Link href={portal.href}>
                  <motion.div whileHover={{ y: -8, transition: { duration: 0.2 } }} className={`group relative bg-card/40 backdrop-blur-xl border ${portal.border} hover:border-opacity-80 rounded-3xl p-8 cursor-pointer transition-colors duration-300 shadow-2xl ${portal.glow} flex flex-col h-full overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <portal.icon className={`w-7 h-7 ${portal.accent}`} strokeWidth={1.5} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${portal.badgeBg}`}>{portal.role}</span>
                      </div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${portal.accent} mb-2 opacity-70`}>{portal.tagline}</p>
                      <h2 className="text-2xl font-serif font-bold text-white mb-5">{portal.role} Portal</h2>
                      <ul className="space-y-2.5 mb-8 flex-1">
                        {portal.features.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                            <CheckCircle className={`w-4 h-4 ${portal.accent} flex-shrink-0`} /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className={`flex items-center gap-2 text-sm font-bold ${portal.accent} group-hover:gap-3 transition-all mt-auto`}>
                        {portal.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── JUDGEMENTS SECTION ── */}
        <div className="max-w-6xl mx-auto px-6 mb-28">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Live Updates</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">Recent Judgements</h2>
              <p className="text-white/40 mt-1">Landmark rulings from Indian courts — updated regularly.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white/30 text-sm">
              <Bell className="w-4 h-4" /> 6 new this month
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {judgements.map((j, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.07 * i }}
                className="bg-card/40 border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all cursor-pointer group"
                onClick={() => setExpandedJ(expandedJ === i ? null : i)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${j.categoryColor}`}>{j.category}</span>
                    <span className="text-white/25 text-xs flex-shrink-0">{j.date}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-snug mb-1 group-hover:text-primary transition-colors">{j.title}</h3>
                  <p className="text-white/35 text-xs mb-3">{j.court} · {j.citation}</p>
                  <p className="text-white/50 text-xs font-medium italic">{j.headnote}</p>
                </div>

                <AnimatePresence>
                  {expandedJ === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/8 bg-white/3 px-5 py-4"
                    >
                      <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mb-2">Bench: {j.bench}</div>
                      <p className="text-white/65 text-xs leading-relaxed">{j.summary}</p>
                      <div className="flex gap-2 mt-4">
                        <Link href="/client/ai-assistant">
                          <button className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all" onClick={e => e.stopPropagation()}>
                            <Sparkles className="w-3 h-3" /> Ask AI about this
                          </button>
                        </Link>
                        <Link href="/client/book">
                          <button className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all" onClick={e => e.stopPropagation()}>
                            <Gavel className="w-3 h-3" /> Consult an Advocate
                          </button>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`px-5 py-2 flex items-center justify-between border-t border-white/5 bg-white/2 text-[10px] text-white/25`}>
                  <span>{expandedJ === i ? "Click to collapse" : "Click to read summary"}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedJ === i ? "rotate-90" : ""}`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Category filter strip */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-8 flex flex-wrap gap-2 justify-center">
            {["All", "Criminal", "Property", "Consumer", "Family", "Corporate", "Banking"].map(cat => (
              <button key={cat} className="text-xs px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/25 transition-all font-medium">
                {cat}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Feature highlights */}
        <div className="max-w-6xl mx-auto px-6 mb-28">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Everything You Need</h2>
            <p className="text-white/40">Built for every stakeholder in the legal system.</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.08 * i }} whileHover={{ scale: 1.03 }} className="bg-card/30 border border-white/8 hover:border-white/20 rounded-2xl p-5 transition-all cursor-default">
                <f.icon className="w-7 h-7 text-primary mb-3" strokeWidth={1.5} />
                <h3 className="text-white font-bold mb-1">{f.label}</h3>
                <p className="text-white/40 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-blue-500/10 border border-primary/30 rounded-3xl p-10 sm:p-14 text-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[80px] rounded-full" />
            </div>
            <div className="relative z-10">
              <Scale className="w-10 h-10 text-primary mx-auto mb-5" strokeWidth={1.5} />
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Don't face legal issues alone.</h2>
              <p className="text-white/50 mb-8 text-lg max-w-xl mx-auto">Connect with an experienced advocate from Rishika Nagpal & Associates in under 60 seconds.</p>
              <Link href="/client/book">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-background px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 transition-all">
                  <Gavel className="w-5 h-5" /> Book a Consultation <ArrowRight className="w-5 h-5" />
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
