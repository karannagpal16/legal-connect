import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Scale, Gavel, BookOpen, ArrowRight, ChevronRight, Star, ExternalLink, Newspaper, Radio } from "lucide-react";

/* ═══════════════════════════════════════════════
   DHARMA CHAKRA — precise 24-spoke Ashoka wheel
═══════════════════════════════════════════════ */
function DharmaChakra({ size = 130 }: { size?: number }) {
  const cx = 64, cy = 64, R = 60;
  const spokeInner = 11, spokeOuter = 49;
  const outerDotR = 56.5;

  const spokes = Array.from({ length: 24 }, (_, i) => {
    const a = ((i * 360) / 24 - 90) * (Math.PI / 180);
    return {
      x1: cx + spokeInner * Math.cos(a), y1: cy + spokeInner * Math.sin(a),
      x2: cx + spokeOuter * Math.cos(a), y2: cy + spokeOuter * Math.sin(a),
      major: i % 3 === 0,
    };
  });

  const outerDots = Array.from({ length: 24 }, (_, i) => {
    const a = ((i * 360) / 24 - 90) * (Math.PI / 180);
    return { x: cx + outerDotR * Math.cos(a), y: cy + outerDotR * Math.sin(a), major: i % 3 === 0 };
  });

  return (
    <svg
      width={size} height={size} viewBox="0 0 128 128"
      style={{ filter: "drop-shadow(0 0 18px rgba(212,175,55,0.7)) drop-shadow(0 0 6px rgba(245,208,120,0.5))" }}
    >
      <defs>
        <radialGradient id="chakraBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff8dc" />
          <stop offset="25%" stopColor="#f5d078" />
          <stop offset="55%" stopColor="#d4af37" />
          <stop offset="80%" stopColor="#a07820" />
          <stop offset="100%" stopColor="#6b4e10" />
        </radialGradient>
        <radialGradient id="hubGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="40%" stopColor="#f5d078" />
          <stop offset="100%" stopColor="#8B6514" />
        </radialGradient>
        <linearGradient id="spokeFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d078" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="0.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Outer decorative thin ring */}
      <circle cx={cx} cy={cy} r={R + 2} fill="none" stroke="url(#spokeFill)" strokeWidth="0.4" opacity="0.5" />
      {/* Main outer rim */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#chakraBody)" strokeWidth="4.5" />
      {/* Inner rim edge line */}
      <circle cx={cx} cy={cy} r={spokeOuter + 1.5} fill="none" stroke="url(#spokeFill)" strokeWidth="0.5" opacity="0.7" />
      <circle cx={cx} cy={cy} r={spokeOuter - 0.5} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.3" />

      {/* 24 spokes */}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.major ? "url(#chakraBody)" : "url(#spokeFill)"}
          strokeWidth={s.major ? "1.6" : "0.8"}
          strokeLinecap="round"
          opacity={s.major ? 1 : 0.7}
          filter={s.major ? "url(#glow)" : undefined}
        />
      ))}

      {/* 24 rim dots */}
      {outerDots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.major ? 1.8 : 0.9} fill="url(#chakraBody)" opacity={d.major ? 1 : 0.6} />
      ))}

      {/* Hub outer ring */}
      <circle cx={cx} cy={cy} r={spokeInner + 1.5} fill="none" stroke="url(#chakraBody)" strokeWidth="1" opacity="0.6" />
      {/* Hub fill */}
      <circle cx={cx} cy={cy} r={spokeInner + 0.5} fill="url(#hubGrad)" />
      {/* Hub dark center */}
      <circle cx={cx} cy={cy} r={5.5} fill="#0a0f25" />
      {/* Hub highlight dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="url(#hubGrad)" />
      <circle cx={cx - 0.8} cy={cy - 0.8} r={1} fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   SHLOKAS — rotating content for phone screen
═══════════════════════════════════════════════ */
const SHLOKAS = [
  {
    id: 1,
    sanskrit: ["यदा यदा हि धर्मस्य", "ग्लानिर्भवति भारत ।", "अभ्युत्थानमधर्मस्य", "तदात्मानं सृजाम्यहम् ॥"],
    ref: "Bhagavad Gita · 4:7",
    english: "Whenever righteousness declines and unrighteousness rises — I descend Myself.",
  },
  {
    id: 2,
    sanskrit: ["परित्राणाय साधूनां", "विनाशाय च दुष्कृताम् ।", "धर्मसंस्थापनार्थाय", "सम्भवामि युगे युगे ॥"],
    ref: "Bhagavad Gita · 4:8",
    english: "For protection of the good, destruction of the wicked, and establishment of Dharma — I manifest in every age.",
  },
  {
    id: 3,
    sanskrit: ["कर्मण्येवाधिकारस्ते", "मा फलेषु कदाचन ।", "मा कर्मफलहेतुर्भूः", "मा ते सङ्गोऽस्त्वकर्मणि ॥"],
    ref: "Bhagavad Gita · 2:47",
    english: "You have a right to perform your duty, but never claim ownership of its fruits. Let not the fruits of action be your motive.",
  },
  {
    id: 4,
    sanskrit: ["सत्यमेव जयते", "नानृतम् ।", "सत्येन पन्था", "विततो देवयानः ॥"],
    ref: "Mundaka Upanishad · 3:1:6",
    english: "Truth alone triumphs, not falsehood. Through truth the divine path is spread out — the path by which the seers reach their goal.",
  },
  {
    id: 5,
    sanskrit: ["धर्मो रक्षति", "रक्षितः ।", "धर्मं न रक्षन्तं", "नाशयते धर्मः ॥"],
    ref: "Manusmriti · 8:15",
    english: "Dharma protects those who protect it. Dharma destroys those who destroy it.",
  },
];

/* ═══════════════════════════════════════════════
   PHONE MOCKUP with rotating shlokas
═══════════════════════════════════════════════ */
function PhoneMockup() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % SHLOKAS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const shloka = SHLOKAS[idx];

  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient glow behind phone */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 80% at 50% 60%, rgba(212,175,55,0.18) 0%, transparent 70%)", borderRadius: "40px", transform: "scale(1.15)" }} />

      {/* Phone shell */}
      <div
        className="relative w-[210px] bg-gradient-to-b from-[#1c1c2e] via-[#0d1020] to-[#080c18] rounded-[38px]"
        style={{
          boxShadow: "0 0 0 1.5px rgba(212,175,55,0.25), 0 0 0 5px #0d1020, 0 0 0 6px rgba(212,175,55,0.15), 0 40px 100px rgba(0,0,0,0.9)",
        }}
      >
        {/* Side buttons */}
        <div className="absolute -right-[3px] top-24 w-[3px] h-12 bg-gradient-to-b from-[#2a2a40] to-[#1a1a30] rounded-r-sm" />
        <div className="absolute -left-[3px] top-20 w-[3px] h-8 bg-gradient-to-b from-[#2a2a40] to-[#1a1a30] rounded-l-sm" />
        <div className="absolute -left-[3px] top-32 w-[3px] h-8 bg-gradient-to-b from-[#2a2a40] to-[#1a1a30] rounded-l-sm" />

        {/* Notch */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[70px] h-[22px] bg-[#080c18] rounded-full z-20 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1a1a30]" />
          <div className="w-1 h-1 rounded-full bg-[#2a2a40]" />
        </div>

        {/* Screen glass */}
        <div
          className="mx-[7px] mt-[7px] mb-[7px] rounded-[31px] overflow-hidden flex flex-col"
          style={{ minHeight: "440px", background: "linear-gradient(175deg, #060d22 0%, #030814 100%)" }}
        >
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-8 pb-0">
            <span className="text-[8px] text-[#d4af37]/40 font-mono">9:41</span>
            <span className="text-[7px] text-[#d4af37]/30">●●●</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col px-5 pt-3 pb-5">
            {/* Badge */}
            <div className="flex justify-center mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "radial-gradient(circle, rgba(212,175,55,0.25), rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.5)" }}>
                <Scale className="w-4 h-4 text-[#d4af37]" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-3">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#d4af37]/55 font-semibold">Legal Portal</p>
              <p className="text-[10px] text-[#f5d078]/80 font-bold tracking-wide" style={{ fontFamily: "serif" }}>Rishika Nagpal & Associates</p>
            </div>

            {/* Gold divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5))" }} />
              <span className="text-[#d4af37]/50 text-[8px]">✦</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.5))" }} />
            </div>

            {/* Rotating shloka */}
            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={shloka.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.6 }}
                  className="text-center"
                >
                  {/* Sanskrit lines */}
                  <div className="mb-3 space-y-0.5">
                    {shloka.sanskrit.map((line, li) => (
                      <p key={li} className="text-[9.5px] leading-snug font-medium" style={{ color: "rgba(245,208,120,0.92)", fontFamily: "serif" }}>
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-1.5 justify-center mb-3">
                    <div className="h-px w-8" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4))" }} />
                    <div className="w-1 h-1 rounded-full bg-[#d4af37]/40" />
                    <div className="h-px w-8" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.4))" }} />
                  </div>

                  {/* English */}
                  <p className="text-[7.5px] leading-relaxed italic text-center px-1" style={{ color: "rgba(212,175,55,0.65)" }}>
                    "{shloka.english}"
                  </p>

                  {/* Ref */}
                  <p className="mt-2 text-[7px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.38)" }}>
                    — {shloka.ref} —
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-1 mt-3">
              {SHLOKAS.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? "14px" : "4px", height: "4px", background: i === idx ? "rgba(212,175,55,0.8)" : "rgba(212,175,55,0.25)" }} />
              ))}
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-2.5">
          <div className="w-20 h-[3px] rounded-full" style={{ background: "rgba(212,175,55,0.2)" }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PORTAL CARD
═══════════════════════════════════════════════ */
interface PortalCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  subLabel?: string;
  emoji?: string;
  color?: string;
}

function PortalCard({ href, icon: Icon, label, subLabel, emoji, color = "#d4af37" }: PortalCardProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -6, scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="group relative cursor-pointer"
      >
        <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 blur-sm"
          style={{ background: `linear-gradient(135deg, ${color}40, ${color}10)` }} />
        <div
          className="relative rounded-2xl p-4 text-center"
          style={{
            background: "linear-gradient(145deg, rgba(25,45,100,0.95) 0%, rgba(12,22,58,0.98) 100%)",
            border: `1.5px solid rgba(212,175,55,0.50)`,
            boxShadow: "0 6px 28px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.28), inset 0 0 20px rgba(212,175,55,0.04)",
          }}
        >
          {/* Top shimmer */}
          <div className="absolute top-0 inset-x-5 h-px rounded-full"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)" }} />
          {/* Icon */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2), rgba(212,175,55,0.04))", border: "1px solid rgba(212,175,55,0.45)", boxShadow: "0 0 16px rgba(212,175,55,0.12)" }}>
            {emoji ? <span className="text-lg">{emoji}</span> : <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest leading-tight" style={{ color: "#f5d078" }}>{label}</p>
          {subLabel && <p className="text-[9px] mt-0.5 uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.45)" }}>{subLabel}</p>}
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-0.5 text-[9px]" style={{ color: "rgba(212,175,55,0.6)" }}>
            Enter <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════
   LIVE LEGAL NEWS TABLE
═══════════════════════════════════════════════ */
const LEGAL_NEWS = [
  { tag: "SC", color: "#ef4444", headline: "Supreme Court upholds Right to Privacy as Fundamental Right in digital data case", date: "Apr 2026", court: "Supreme Court" },
  { tag: "HC", color: "#f59e0b", headline: "Delhi HC directs expedited hearing for 2.3 lakh pending matrimonial cases under Fast Track scheme", date: "Apr 2026", court: "Delhi HC" },
  { tag: "NEW", color: "#22c55e", headline: "Digital Personal Data Protection Rules 2025 notified — consent framework to go live June 2026", date: "Mar 2026", court: "MeitY" },
  { tag: "SC", color: "#ef4444", headline: "SC: All High Courts must display cause lists 48 hrs in advance, opens portal for live order access", date: "Mar 2026", court: "Supreme Court" },
  { tag: "LAW", color: "#8b5cf6", headline: "Bharatiya Nyaya Sanhita 2023 fully operative — IPC repealed across all 28 states", date: "Feb 2026", court: "MHA" },
  { tag: "HC", color: "#f59e0b", headline: "Delhi HC: Builders must compensate flat buyers ₹50,000/month for delayed possession beyond 2 years", date: "Feb 2026", court: "Delhi HC" },
  { tag: "NEW", color: "#22c55e", headline: "NDA launches 'Legal Aid Express' app for free legal consultations in 200 district HQs", date: "Jan 2026", court: "Dept of Justice" },
  { tag: "SC", color: "#ef4444", headline: "SC: Accused can't be denied bail solely on media trial — orders guidelines for coverage of sub-judice matters", date: "Jan 2026", court: "Supreme Court" },
  { tag: "LAW", color: "#8b5cf6", headline: "Consumer Protection Amendment 2025 — product liability expanded; 30-day return window mandatory", date: "Dec 2025", court: "MCA" },
  { tag: "HC", color: "#f59e0b", headline: "Delhi HC strikes down arbitrary termination of contractual govt employees, awards 3-year back pay", date: "Dec 2025", court: "Delhi HC" },
];

function LiveNewsTable() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % LEGAL_NEWS.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(170deg, rgba(15,28,65,0.98) 0%, rgba(8,16,42,0.99) 100%)",
        border: "1.5px solid rgba(212,175,55,0.3)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#d4af37]/15"
        style={{ background: "linear-gradient(to right, rgba(212,175,55,0.08), rgba(212,175,55,0.03))" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <Newspaper className="w-3.5 h-3.5 text-[#d4af37]/70" />
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#d4af37]/80">Live Legal Updates</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-[#d4af37]/40 animate-pulse" />
          <span className="text-[8px] text-[#d4af37]/35 uppercase tracking-wider">India · 2026</span>
        </div>
      </div>

      {/* News rows */}
      <div className="divide-y divide-[#d4af37]/08">
        {LEGAL_NEWS.map((item, i) => (
          <motion.div
            key={i}
            animate={{ backgroundColor: i === active ? "rgba(212,175,55,0.06)" : "rgba(0,0,0,0)" }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-3 px-4 py-2.5 cursor-default"
          >
            {/* Tag badge */}
            <div className="flex-shrink-0 mt-0.5">
              <span
                className="text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ backgroundColor: `${item.color}18`, color: item.color, border: `1px solid ${item.color}40` }}
              >
                {item.tag}
              </span>
            </div>
            {/* Headline */}
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] leading-snug transition-colors duration-300 ${i === active ? "text-[#f5d078]" : "text-[#d4af37]/55"}`}>
                {item.headline}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] text-[#d4af37]/30">{item.court}</span>
                <span className="text-[#d4af37]/20">·</span>
                <span className="text-[8px] text-[#d4af37]/25">{item.date}</span>
              </div>
            </div>
            {/* Active indicator */}
            {i === active && (
              <div className="flex-shrink-0 mt-1.5">
                <div className="w-1 h-1 rounded-full bg-[#d4af37]/60 animate-pulse" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#d4af37]/10 flex items-center justify-between"
        style={{ background: "rgba(212,175,55,0.02)" }}>
        <p className="text-[8px] text-[#d4af37]/25 italic">Updates compiled from SC, Delhi HC & legislative records</p>
        <Link href="/client/rights">
          <button className="text-[8px] text-[#d4af37]/40 hover:text-[#d4af37]/70 flex items-center gap-0.5 transition-colors">
            Know your rights <ExternalLink className="w-2 h-2" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PEACOCK FEATHER
═══════════════════════════════════════════════ */
function PeacockFeather() {
  return (
    <svg width="90" height="200" viewBox="0 0 90 200" className="opacity-75">
      <defs>
        <linearGradient id="pfq" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#d4af37" /><stop offset="100%" stopColor="#7a5c10" /></linearGradient>
        <linearGradient id="pfb1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#059669" /><stop offset="50%" stopColor="#2563eb" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="pfb2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#064e3b" /><stop offset="100%" stopColor="#1e40af" /></linearGradient>
        <radialGradient id="pfe"><stop offset="0%" stopColor="#93c5fd" /><stop offset="35%" stopColor="#2563eb" /><stop offset="65%" stopColor="#065f46" /><stop offset="100%" stopColor="#d4af37" /></radialGradient>
      </defs>
      <path d="M45 200 Q43 155 41 120 Q39 80 45 15" stroke="url(#pfq)" strokeWidth="1.5" fill="none" />
      {Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13, y = 200 - t * 170, x = 42 + t * 3, sp = 8 + t * 35, cv = 18 + t * 25;
        return (
          <g key={i}>
            <path d={`M${x} ${y} Q${x - sp * 0.4} ${y - cv * 0.5} ${x - sp} ${y - cv}`} stroke={t > 0.5 ? "url(#pfb1)" : "url(#pfb2)"} strokeWidth={t > 0.6 ? "1.2" : "0.7"} fill="none" opacity={0.35 + t * 0.65} />
            <path d={`M${x} ${y} Q${x + sp * 0.4} ${y - cv * 0.5} ${x + sp} ${y - cv}`} stroke="url(#pfb1)" strokeWidth={t > 0.6 ? "1.2" : "0.7"} fill="none" opacity={0.35 + t * 0.65} />
          </g>
        );
      })}
      <ellipse cx="45" cy="22" rx="10" ry="14" fill="url(#pfe)" opacity="0.9" />
      <ellipse cx="45" cy="22" rx="6" ry="9" fill="#0f0a30" />
      <ellipse cx="45" cy="22" rx="3.5" ry="5" fill="#3730a3" />
      <ellipse cx="45" cy="22" rx="1.8" ry="2.5" fill="#6d28d9" />
      <ellipse cx="44" cy="21" rx="0.8" ry="1.1" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════ */
export function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative"
      style={{ background: "radial-gradient(ellipse 140% 90% at 50% -10%, #0d1f45 0%, #050d28 45%, #020810 100%)" }}>

      {/* ── Background atmosphere ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: "900px", height: "350px", background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 left-0 rounded-full" style={{ width: "500px", height: "500px", background: "radial-gradient(ellipse, rgba(30,60,140,0.18) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 right-0 rounded-full" style={{ width: "450px", height: "450px", background: "radial-gradient(ellipse, rgba(60,30,120,0.14) 0%, transparent 70%)" }} />
        {/* Subtle dot matrix */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(212,175,55,1) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        {/* Gold floor glow */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(212,175,55,0.04), transparent)" }} />
      </div>

      {/* ── HEADER: Chakra + Firm Name ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center pt-8 pb-5"
      >
        {/* Chakra with rotation */}
        <div className="mb-5 relative">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.15), transparent 60%)", transform: "scale(1.8)" }} />
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
            <DharmaChakra size={120} />
          </motion.div>
        </div>

        {/* RN + Name */}
        <div className="flex items-center gap-4 mb-2">
          <span className="font-black leading-none tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontFamily: "Georgia, serif", background: "linear-gradient(135deg, #ffe680 0%, #f5d078 20%, #d4af37 50%, #a07820 75%, #f5d078 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 12px rgba(212,175,55,0.35))" }}>
            RN
          </span>
          <div className="h-14 w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.5), transparent)" }} />
          <div>
            <div className="font-black tracking-widest leading-tight"
              style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.6rem)", fontFamily: "Georgia, serif", background: "linear-gradient(120deg, #f5e070, #d4af37, #b8860b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              RISHIKA NAGPAL
            </div>
            <div className="font-black tracking-widest"
              style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.6rem)", fontFamily: "Georgia, serif", background: "linear-gradient(120deg, #d4af37, #a07820)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              & ASSOCIATES
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px w-16" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5))" }} />
          <span className="text-[11px] tracking-[0.35em] uppercase font-semibold" style={{ color: "rgba(212,175,55,0.55)" }}>Advocates & Consultants</span>
          <div className="h-px w-16" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.5))" }} />
        </div>
      </motion.div>

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-10 justify-center">

          {/* ─ LEFT: Phone ─ */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="flex-shrink-0 self-center lg:self-start lg:mt-4"
            style={{ transform: "perspective(800px) rotateY(4deg) rotateZ(-3deg)" }}
          >
            <PhoneMockup />
          </motion.div>

          {/* ─ RIGHT: Portals + News ─ */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Portal header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-[10px] uppercase tracking-[0.38em] font-bold mb-1.5" style={{ color: "rgba(212,175,55,0.6)" }}>Enter Your Portal</p>
              <div className="flex items-center gap-3 justify-center">
                <div className="h-px w-10" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4))" }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(212,175,55,0.6)" }} />
                <div className="h-px w-10" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.4))" }} />
              </div>
            </motion.div>

            {/* Portal cards */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="grid grid-cols-3 gap-3"
            >
              <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" color="#f59e0b" />
              <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" color="#60a5fa" />
              <PortalCard href="/intern" icon={BookOpen} label="Intern" subLabel="Knowledge" emoji="📚" color="#a78bfa" />
            </motion.div>

            {/* Quick links row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center"
            >
              {[
                { label: "Wellness Quiz", href: "/client/wellness" },
                { label: "Know Your Rights", href: "/client/rights" },
                { label: "Connect Advocate", href: "/client/connect" },
                { label: "Case Tracker", href: "/client/cases" },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <button className="group text-[10px] tracking-wide transition-colors flex items-center gap-0.5" style={{ color: "rgba(212,175,55,0.35)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,175,55,0.7)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.35)")}>
                    {l.label} <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </Link>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-3 justify-center"
            >
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.2))" }} />
              <Star className="w-2.5 h-2.5" style={{ color: "rgba(212,175,55,0.4)" }} fill="rgba(212,175,55,0.4)" />
              <span className="text-[9px] uppercase tracking-[0.28em] font-medium" style={{ color: "rgba(212,175,55,0.38)" }}>धर्मो रक्षति रक्षितः</span>
              <Star className="w-2.5 h-2.5" style={{ color: "rgba(212,175,55,0.4)" }} fill="rgba(212,175,55,0.4)" />
              <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.2))" }} />
            </motion.div>

            {/* ─ Live News Table ─ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <LiveNewsTable />
            </motion.div>
          </div>

          {/* ─ Peacock (xl only) ─ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="hidden xl:flex flex-shrink-0 self-end pb-2"
          >
            <PeacockFeather />
          </motion.div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="relative z-10 text-center py-4 border-t" style={{ borderColor: "rgba(212,175,55,0.08)" }}>
        <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(212,175,55,0.22)" }}>
          Subhash Nagar, New Delhi &nbsp;·&nbsp; Est. 2018 &nbsp;·&nbsp; Delhi High Court & Supreme Court
        </p>
      </div>
    </div>
  );
}
