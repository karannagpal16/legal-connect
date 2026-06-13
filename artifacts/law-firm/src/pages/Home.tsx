import { Link } from "wouter";
import { Scale, Gavel, BookOpen, ArrowRight, ChevronRight, Newspaper, Landmark, Quote, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const legalNews = [
  { tag: "SC", tagColor: "#ef4444", title: "Supreme Court upholds Right to Privacy as Fundamental Right in digital data case", source: "Supreme Court", date: "Apr 2026", img: "/news/news-1.png" },
  { tag: "HC", tagColor: "#3b82f6", title: "Delhi HC directs expedited hearing for 2.3 lakh pending matrimonial cases under Fast Track scheme", source: "Delhi HC", date: "Apr 2026", img: "/news/news-2.png" },
  { tag: "LAW", tagColor: "#22c55e", title: "Digital Personal Data Protection Rules 2025 notified — consent framework to go live June 2026", source: "MeitY", date: "Mar 2026", img: "/news/news-3.png" },
  { tag: "SC", tagColor: "#ef4444", title: "All High Courts must display cause lists 48 hrs in advance, opens portal for live order access", source: "Supreme Court", date: "Mar 2026", img: "/news/news-4.png" },
  { tag: "NEW", tagColor: "#f59e0b", title: "Bharatiya Nyaya Sanhita 2023 fully operative — IPC repealed across all 28 states", source: "MHA", date: "Feb 2026", img: "/news/news-5.png" },
  { tag: "HC", tagColor: "#3b82f6", title: "High Court mandates e-filing for all civil suits above ₹10 lakh — paperless courts by 2027", source: "Delhi HC", date: "Feb 2026", img: "/news/news-6.png" },
  { tag: "SC", tagColor: "#ef4444", title: "SC expands Legal Aid to include free online consultations for below poverty line citizens", source: "Supreme Court", date: "Jan 2026", img: "/news/news-7.png" },
  { tag: "LAW", tagColor: "#22c55e", title: "Mediation Act 2023 rules notified — mandatory pre-litigation mediation for commercial disputes", source: "Law Ministry", date: "Jan 2026", img: "/news/news-8.png" },
];

const marqueeItems = [
  "Delhi High Court", "Supreme Court of India", "Family Law", "Criminal Defence", "Corporate Law",
  "Civil Litigation", "Property Disputes", "Cyber Crime", "Constitutional Law", "Mediation & Arbitration",
];

const dharmaQuotes = [
  { text: "धर्मो रक्षति रक्षितः", sub: "Dharma protects those who protect it", source: "Manusmriti, 8.15" },
  { text: "यतो धर्मस् ततो जयः", sub: "Where there is righteousness, there is victory", source: "Mahabharata, Shanti Parva" },
  { text: "Whenever there is a decline of righteousness, I manifest myself", sub: "For the protection of the good and the destruction of evil", source: "Bhagavad Gita, 4.7-8" },
  { text: "The law of the ruler is the law of the land", sub: "A ruler who upholds dharma protects the entire world", source: "Chanakya Niti, Arthashastra" },
  { text: "There is no greater dharma than truth", sub: "Truth alone is the foundation of justice", source: "Ramayana, Ayodhya Kanda" },
  { text: "The king's duty is to protect the people", sub: "As a shepherd protects his flock, the ruler protects the nation", source: "Bhagavad Gita, 1.1" },
  { text: "A person should not be too honest", sub: "Straight trees are cut first, and honest people are scammed first", source: "Chanakya Niti" },
  { text: "A ruler must be a servant of dharma", sub: "Not the master of the people, but the protector of righteousness", source: "Mahabharata, Shanti Parva" },
  { text: "The world is sustained by dharma", sub: "If dharma is destroyed, the world collapses", source: "Mahabharata, Anushasana Parva" },
  { text: "The sword of justice is the strength of the ruler", sub: "Without it, even the mighty fall", source: "Chanakya Niti, Arthashastra" },
  { text: "One who is not grateful is not a friend", sub: "Gratitude is the foundation of all human relations", source: "Ramayana, Kishkindha Kanda" },
  { text: "Swaraj is my birthright", sub: "And I shall have it", source: "Bal Gangadhar Tilak" },
  { text: "Injustice anywhere is a threat to justice everywhere", sub: "We are caught in an inescapable network of mutuality", source: "Dr. B.R. Ambedkar" },
  { text: "Constitution is not a mere lawyer's document", sub: "It is a vehicle of life, and its spirit is always the spirit of the age", source: "Dr. B.R. Ambedkar" },
  { text: "Satyameva Jayate", sub: "Truth alone triumphs", source: "Mundaka Upanishad, 3.1.6" },
];

/* ──────────────── THEME ──────────────── */
const T = {
  bg: "#FFFFFF",
  bgLight: "#F8FAFC",
  card: "#FFFFFF",
  cardHover: "#F1F5F9",
  gold: "#D97706",
  goldLight: "#F59E0B",
  amber: "#B45309",
  navy: "#1E3A5F",
  navyLight: "#2A5C8F",
  text: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
};

function DharmaChakra({ size = 80 }: { size?: number }) {
  const r = size / 2;
  const cx = r, cy = r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={T.gold} stopOpacity="0.4" />
          <stop offset="60%" stopColor={T.gold} stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={T.goldLight} />
          <stop offset="50%" stopColor={T.gold} />
          <stop offset="100%" stopColor={T.amber} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#glow)" />
      <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke="url(#gold)" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="url(#gold)" strokeWidth="1" opacity="0.4" />
      <circle cx={cx} cy={cy} r={r * 0.15} fill="url(#gold)" />
      <circle cx={cx} cy={cy} r={r * 0.08} fill="#FFFFFF" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 360 / 24) * Math.PI / 180;
        const s = r * 0.17, e = r * 0.76;
        return (
          <line key={i} x1={cx + s * Math.cos(a)} y1={cy + s * Math.sin(a)}
                x2={cx + e * Math.cos(a)} y2={cy + e * Math.sin(a)}
                stroke="url(#gold)" strokeWidth={i % 3 === 0 ? 1.5 : 0.7} opacity={i % 3 === 0 ? 0.9 : 0.4} />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return <circle key={i} cx={cx + (r * 0.88) * Math.cos(a)} cy={cy + (r * 0.88) * Math.sin(a)} r="2" fill="url(#gold)" />;
      })}
    </svg>
  );
}

function PortalCard({ href, icon: Icon, label, subLabel, idx, accent, bg, glow }: {
  href: string; icon: React.ElementType; label: string; subLabel: string; idx: number;
  accent: string; bg: string; glow: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + idx * 0.15, duration: 0.6 }}
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group relative cursor-pointer"
      >
        {/* Hover glow */}
        <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 blur-xl"
             style={{ background: glow }} />

        <div className="relative rounded-xl p-6 text-center overflow-hidden transition-all duration-500"
             style={{ background: bg, border: `1px solid ${accent}40`, boxShadow: `0 4px 20px ${accent}15, inset 0 1px 0 rgba(255,255,255,0.8)` }}>

          {/* Top line */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

          {/* Corner sparkle */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity duration-500">
            <Sparkles className="w-4 h-4" style={{ color: accent }} />
          </div>

          {/* Icon */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-110"
                 style={{ background: `${accent}15`, border: `1px solid ${accent}30` }} />
            <div className="w-16 h-16 rounded-xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300"
                 style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
              <Icon className="w-7 h-7" style={{ color: accent }} strokeWidth={1.5} />
            </div>
          </div>

          <p className="font-bold text-sm uppercase tracking-[0.2em]" style={{ color: T.text }}>{label}</p>
          <p className="text-[10px] mt-1 uppercase tracking-[0.15em] font-semibold" style={{ color: accent }}>{subLabel}</p>

          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0"
               style={{ color: accent }}>
            Enter Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function DharmaQuoteBar() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % dharmaQuotes.length), 5000);
    return () => clearInterval(t);
  }, []);
  const q = dharmaQuotes[idx];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
                className="relative w-full max-w-2xl mx-auto">
      <div className="relative rounded-xl overflow-hidden"
           style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: `0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)` }}>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${T.gold}, ${T.amber}, ${T.gold})` }} />
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.gold}20, ${T.amber}30)` }}>
                <Quote className="w-4 h-4" style={{ color: T.gold }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                  <p className="text-lg sm:text-xl font-serif font-bold leading-snug" style={{ color: T.text }}>{q.text}</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: T.textMuted }}>{q.sub}</p>
                  <p className="text-[10px] mt-2 uppercase tracking-wider font-bold" style={{ color: T.gold }}>{q.source}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 justify-center">
            {dharmaQuotes.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className="transition-all duration-300 rounded-full"
                      style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? T.gold : `${T.border}`,
                               boxShadow: i === idx ? `0 0 8px ${T.gold}50` : "none" }} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LiveNewsPanel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % legalNews.length), 5000);
    return () => clearInterval(t);
  }, []);
  const item = legalNews[active];
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
                className="w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <Newspaper className="w-4 h-4" style={{ color: T.gold }} />
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: T.gold }}>Live Legal Updates · India</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${T.border}, transparent)` }} />
      </div>
      <div className="rounded-xl overflow-hidden"
           style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.3)` }}>
        <div className="relative w-full aspect-[16/7] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img key={active} src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
                        initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} />
          </AnimatePresence>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${T.bg}f0, ${T.bg}80, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${T.bg}80, transparent)` }} />
          <AnimatePresence mode="wait">
            <motion.div key={active} className="absolute bottom-0 left-0 right-0 p-5 sm:p-7"
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.6, delay: 0.15 }}>
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded text-white mb-3 shadow-lg" style={{ background: item.tagColor }}>{item.tag}</span>
              <h3 className="text-base sm:text-xl font-bold leading-snug mb-2" style={{ color: T.text }}>{item.title}</h3>
              <p className="text-xs" style={{ color: T.textMuted }}>{item.source} · {item.date}</p>
            </motion.div>
          </AnimatePresence>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border" style={{ borderColor: T.border }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider font-bold text-white">Live</span>
          </div>
        </div>
        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide" style={{ background: T.bgLight }}>
          {legalNews.map((n, i) => (
            <button key={i} onClick={() => setActive(i)}
                    className="relative flex-shrink-0 w-14 h-10 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all duration-300 group/thumb"
                    style={{ border: i === active ? `2px solid ${T.gold}` : `2px solid ${T.border}`, opacity: i === active ? 1 : 0.4,
                             boxShadow: i === active ? `0 0 12px ${T.gold}30` : "none" }}>
              <img src={n.img} alt="" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300" />
              {i === active && <div className="absolute inset-0" style={{ background: `${T.gold}10` }} />}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Marquee() {
  return (
    <div className="relative overflow-hidden py-3" style={{ background: T.bgLight, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10" style={{ background: `linear-gradient(90deg, ${T.bgLight}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10" style={{ background: `linear-gradient(270deg, ${T.bgLight}, transparent)` }} />
      <div className="flex animate-marquee whitespace-nowrap">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="mx-6 text-[10px] uppercase tracking-[0.3em] font-semibold flex items-center gap-3" style={{ color: T.textMuted }}>
            {item} <span style={{ color: T.gold }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: T.bg }}>
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20" style={{ background: T.gold }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10" style={{ background: T.amber }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-10" style={{ background: T.gold }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle, ${T.gold} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
                  className="relative z-10 flex flex-col items-center pt-10 pb-6">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: 360 }}
                    transition={{ scale: { duration: 0.8, ease: "easeOut" }, opacity: { duration: 0.8 }, rotate: { duration: 45, repeat: Infinity, ease: "linear" } }}>
          <DharmaChakra size={80} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
                    className="text-center px-6 mt-5">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none font-serif" style={{ color: T.gold }}>LC</span>
            <div className="h-10 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${T.gold}, transparent)` }} />
            <div className="text-left">
              <div className="text-base sm:text-xl font-black tracking-wider leading-tight font-serif" style={{ color: T.navy }}>LEGAL CONNECT</div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center mt-1">
            <div className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${T.gold})` }} />
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: T.gold }}>Advocates & Legal Consultants</p>
            <div className="h-px w-12" style={{ background: `linear-gradient(270deg, transparent, ${T.gold})` }} />
          </div>
        </motion.div>
      </motion.div>

      <Marquee />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-6">
        <div className="flex flex-col gap-6">
          {/* Dharma Quote Bar */}
          <DharmaQuoteBar />

          {/* Portal Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto w-full">
            <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" idx={0}
                        accent="#2563EB" bg="#EFF6FF" glow="#2563EB20" />
            <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" idx={1}
                        accent="#DC2626" bg="#FEF2F2" glow="#DC262620" />
            <PortalCard href="/intern" icon={BookOpen} label="Learn" subLabel="& Rise" idx={2}
                        accent="#D97706" bg="#FFFBEB" glow="#D9770620" />
            <PortalCard href="/client/cases" icon={Landmark} label="eCourt" subLabel="Services" idx={3}
                        accent="#059669" bg="#ECFDF5" glow="#05966920" />
          </div>

          {/* Quick links */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
                      className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {[
              { label: "Wellness Quiz", href: "/client/wellness" },
              { label: "Know Your Rights", href: "/client/rights" },
              { label: "Connect Advocate", href: "/client/connect" },
              { label: "Case Tracker", href: "/client/cases" },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <button className="text-[10px] tracking-wide transition-colors flex items-center gap-1 group bg-transparent border-none cursor-pointer hover:text-[#1E293B]"
                        style={{ color: T.textMuted }}>
                  {l.label} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </Link>
            ))}
          </motion.div>

          {/* Dharmo Rakshati */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }} className="text-center">
            <p className="text-[10px] tracking-[0.2em] uppercase font-bold" style={{ color: T.gold }}>धर्मो रक्षति रक्षितः</p>
            <p className="text-[9px] mt-0.5 tracking-widest" style={{ color: T.textMuted }}>Dharmo Rakshati Rakshitah</p>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <LiveNewsPanel />
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-5" style={{ borderTop: `1px solid ${T.border}` }}>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  className="text-[10px] tracking-[0.3em] uppercase" style={{ color: T.textMuted }}>
          Subhash Nagar, New Delhi · Est. 2018 · Delhi High Court & Supreme Court
        </motion.p>
      </div>
    </div>
  );
}
