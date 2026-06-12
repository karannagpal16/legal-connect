import { Link } from "wouter";
import { Scale, Gavel, BookOpen, ArrowRight, ChevronRight, Newspaper, Landmark, Quote } from "lucide-react";
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

const THEME = {
  emerald: "#0F4C3A",
  emeraldLight: "#1A6B52",
  lotus: "#E8A0BF",
  lotusDeep: "#D488A8",
  gold: "#C5A572",
  goldLight: "#D4B896",
  cream: "#F8F4F0",
  creamWarm: "#F0E8E0",
  text: "#1A2E2A",
  textMuted: "#5A7A6E",
  white: "#FDFCFA",
  indigo: "#2D3A5C",
  sage: "#7B9E87",
  peach: "#F5D0C5",
  lavender: "#C8B8D8",
};

function DharmaChakra({ size = 90 }: { size?: number }) {
  const r = size / 2;
  const cx = r, cy = r;
  const outerR = r * 0.93;
  const innerRingR = r * 0.80;
  const hubR = r * 0.15;
  const spokeEnd = r * 0.78;
  const spokeStart = r * 0.17;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="ckGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={THEME.emerald} stopOpacity="0.25" />
          <stop offset="60%" stopColor={THEME.emeraldLight} stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ckGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={THEME.goldLight} />
          <stop offset="40%" stopColor={THEME.gold} />
          <stop offset="70%" stopColor={THEME.gold} />
          <stop offset="100%" stopColor={THEME.goldLight} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#ckGlow)" />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="url(#ckGold)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={outerR - 4} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.3" />
      <circle cx={cx} cy={cy} r={innerRingR} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.4" />
      <circle cx={cx} cy={cy} r={hubR} fill="url(#ckGold)" />
      <circle cx={cx} cy={cy} r={hubR * 0.6} fill={THEME.cream} />
      <circle cx={cx} cy={cy} r={hubR * 0.25} fill="url(#ckGold)" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = cx + spokeStart * Math.cos(rad), y1 = cy + spokeStart * Math.sin(rad);
        const x2 = cx + spokeEnd * Math.cos(rad), y2 = cy + spokeEnd * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#ckGold)" strokeWidth={i % 3 === 0 ? "1.8" : "0.8"} opacity={i % 3 === 0 ? 1 : 0.5} />;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return <circle key={i} cx={cx + (outerR - 2) * Math.cos(a)} cy={cy + (outerR - 2) * Math.sin(a)} r="2.5" fill="url(#ckGold)" />;
      })}
    </svg>
  );
}

function PortalCard({ href, icon: Icon, label, subLabel, idx, accentColor, bgGradient }: { href: string; icon: React.ElementType; label: string; subLabel: string; idx: number; accentColor: string; bgGradient: string }) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + idx * 0.15, duration: 0.6 }}
        whileHover={{ y: -10, scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group relative cursor-pointer"
      >
        {/* Outer glow on hover */}
        <div className="absolute -inset-2 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700" style={{ background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}10)` }} />

        <div className="relative rounded-2xl p-6 text-center transition-all duration-500 overflow-hidden" style={{ background: bgGradient, border: `1px solid ${accentColor}30`, boxShadow: `0 4px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)` }}>
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />

          {/* Corner decorative elements */}
          <div className="absolute top-3 right-3 w-6 h-6 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
            <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Icon container with animated ring */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-90 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`, border: `1px solid ${accentColor}30` }} />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300" style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`, border: `1px solid ${accentColor}25` }}>
              <Icon className="w-7 h-7" style={{ color: accentColor }} strokeWidth={1.5} />
            </div>
          </div>

          {/* Label */}
          <p className="font-bold text-sm uppercase tracking-[0.2em] relative z-10" style={{ color: THEME.text }}>{label}</p>
          <p className="text-[10px] mt-1 uppercase tracking-[0.15em] relative z-10 font-medium" style={{ color: `${accentColor}90` }}>{subLabel}</p>

          {/* Enter button that appears on hover */}
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0" style={{ color: accentColor }}>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      <div className="relative rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${THEME.cream} 0%, ${THEME.creamWarm} 50%, ${THEME.cream} 100%)`, border: `2px solid ${THEME.emerald}`, boxShadow: `0 4px 24px ${THEME.emerald}15, inset 0 1px 0 rgba(255,255,255,0.8)` }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${THEME.emerald}, ${THEME.lotus}, ${THEME.gold}, ${THEME.emerald})` }} />
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${THEME.emerald}, ${THEME.emeraldLight})` }}>
                <Quote className="w-4 h-4 text-[#1A2E2A]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-lg sm:text-xl font-serif font-bold leading-snug" style={{ color: THEME.emerald }}>
                    {q.text}
                  </p>
                  <p className="text-sm mt-1 font-medium" style={{ color: THEME.textMuted }}>
                    {q.sub}
                  </p>
                  <p className="text-[10px] mt-2 uppercase tracking-wider font-bold" style={{ color: THEME.lotusDeep }}>
                    {q.source}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 justify-center">
            {dharmaQuotes.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx ? THEME.emerald : `${THEME.emerald}25`,
                  boxShadow: i === idx ? `0 0 8px ${THEME.emerald}50` : "none",
                }}
              />
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="w-full max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <Newspaper className="w-4 h-4" style={{ color: THEME.emerald }} />
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: THEME.emerald }}>Live Legal Updates · India</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${THEME.emerald}, transparent)` }} />
      </div>

      <div className="rounded-2xl overflow-hidden bg-white border shadow-lg" style={{ borderColor: `${THEME.emerald}15`, boxShadow: `0 8px 32px ${THEME.emerald}08` }}>
        <div className="relative w-full aspect-[16/7] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={item.img}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${THEME.cream}f0, ${THEME.cream}60, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${THEME.cream}60, transparent)` }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="absolute bottom-0 left-0 right-0 p-5 sm:p-7"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded text-[#1A2E2A] mb-3 shadow-lg" style={{ background: item.tagColor }}>{item.tag}</span>
              <h3 className="text-base sm:text-xl font-bold leading-snug mb-2" style={{ color: THEME.text }}>{item.title}</h3>
              <p className="text-xs" style={{ color: THEME.textMuted }}>{item.source} · {item.date}</p>
            </motion.div>
          </AnimatePresence>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#1A2E2A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border" style={{ borderColor: `${THEME.emerald}30` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: THEME.emerald }}>Live</span>
          </div>
        </div>

        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide bg-[#1A2E2A]/50">
          {legalNews.map((n, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative flex-shrink-0 w-14 h-10 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all duration-300 group/thumb"
              style={{ border: i === active ? `2px solid ${THEME.emerald}` : "2px solid transparent", opacity: i === active ? 1 : 0.4, boxShadow: i === active ? `0 0 12px ${THEME.emerald}30` : "none" }}
            >
              <img src={n.img} alt="" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300" />
              {i === active && <div className="absolute inset-0" style={{ background: `${THEME.emerald}10` }} />}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Marquee() {
  return (
    <div className="relative overflow-hidden py-3">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#F8F4F0] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#F8F4F0] to-transparent z-10" />
      <div className="flex animate-marquee whitespace-nowrap">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="mx-6 text-[10px] uppercase tracking-[0.3em] font-semibold flex items-center gap-3" style={{ color: THEME.textMuted }}>
            {item}
            <span style={{ color: THEME.gold }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: `linear-gradient(180deg, ${THEME.cream} 0%, ${THEME.creamWarm} 40%, ${THEME.cream} 100%)` }}>
      {/* Elegant background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px]" style={{ background: `${THEME.emerald}08` }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `${THEME.lotus}08` }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: `${THEME.gold}08` }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle, ${THEME.emerald} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col items-center pt-8 pb-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 360 }}
          transition={{ scale: { duration: 0.8, ease: "easeOut" }, opacity: { duration: 0.8 }, rotate: { duration: 45, repeat: Infinity, ease: "linear" } }}
        >
          <DharmaChakra size={90} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="text-center px-6 mt-4"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none font-serif" style={{ color: THEME.emerald }}>
              LC
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#C5A572] to-transparent" />
            <div className="text-left">
              <div className="text-base sm:text-xl font-black tracking-wider leading-tight font-serif" style={{ color: THEME.emerald }}>
                LEGAL CONNECT
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center mt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A572]" />
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: THEME.gold }}>Advocates & Legal Consultants</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C5A572]" />
          </div>
        </motion.div>
      </motion.div>

      <Marquee />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="flex flex-col gap-6">
            {/* Dharma Quote Bar */}
            <DharmaQuoteBar />

            {/* Portal Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto w-full">
              <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" idx={0} accentColor={THEME.emerald} bgGradient={`linear-gradient(160deg, #FFFFFF 0%, #E8F4ED 50%, #D4EBE2 100%)`} />
              <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" idx={1} accentColor={THEME.lotusDeep} bgGradient={`linear-gradient(160deg, #FFFFFF 0%, #FCE8F0 50%, #F5D0E0 100%)`} />
              <PortalCard href="/intern" icon={BookOpen} label="Learn" subLabel="& Rise" idx={2} accentColor={THEME.gold} bgGradient={`linear-gradient(160deg, #FFFFFF 0%, #F5EBD4 50%, #E8D4A8 100%)`} />
              <PortalCard href="/client/cases" icon={Landmark} label="eCourt" subLabel="Services" idx={3} accentColor={THEME.indigo} bgGradient={`linear-gradient(160deg, #FFFFFF 0%, #D4D8E8 50%, #B8BFD0 100%)`} />
            </div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-wrap gap-x-4 gap-y-1 justify-center"
            >
              {[
                { label: "Wellness Quiz", href: "/client/wellness" },
                { label: "Know Your Rights", href: "/client/rights" },
                { label: "Connect Advocate", href: "/client/connect" },
                { label: "Case Tracker", href: "/client/cases" },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <button className="text-[10px] tracking-wide transition-colors flex items-center gap-1 group bg-transparent border-none cursor-pointer hover:text-[#0F4C3A]" style={{ color: THEME.textMuted }}>
                    {l.label} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </Link>
              ))}
            </motion.div>

            {/* Dharmo Rakshati */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase font-bold" style={{ color: THEME.emerald }}>धर्मो रक्षति रक्षितः</p>
              <p className="text-[9px] mt-0.5 tracking-widest" style={{ color: THEME.textMuted }}>Dharmo Rakshati Rakshitah</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <LiveNewsPanel />
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-5 border-t" style={{ borderColor: `${THEME.emerald}10` }}>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ color: THEME.textMuted }}
        >
          Subhash Nagar, New Delhi · Est. 2018 · Delhi High Court & Supreme Court
        </motion.p>
      </div>
    </div>
  );
}
