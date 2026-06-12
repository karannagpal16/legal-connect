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
  { text: "यतो धर्मस्ततो जयः", sub: "Where there is righteousness, there is victory", source: "Mahabharata, Shanti Parva" },
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

function DharmaChakra({ size = 100 }: { size?: number }) {
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
          <stop offset="0%" stopColor="#FF9933" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#D2691E" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ckGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9933" />
          <stop offset="40%" stopColor="#D2691E" />
          <stop offset="70%" stopColor="#8B4513" />
          <stop offset="100%" stopColor="#FF9933" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#ckGlow)" />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="url(#ckGold)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={outerR - 4} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.3" />
      <circle cx={cx} cy={cy} r={innerRingR} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.4" />
      <circle cx={cx} cy={cy} r={hubR} fill="url(#ckGold)" />
      <circle cx={cx} cy={cy} r={hubR * 0.6} fill="#FFF5EB" />
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

function PortalCard({ href, icon: Icon, label, subLabel, idx, accentColor }: { href: string; icon: React.ElementType; label: string; subLabel: string; idx: number; accentColor: string }) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + idx * 0.15, duration: 0.6 }}
        whileHover={{ y: -8, scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="group relative cursor-pointer"
      >
        <div className="absolute -inset-1 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, ${accentColor}40, transparent)` }} />
        <div className="relative rounded-2xl p-5 text-center transition-all duration-300 overflow-hidden bg-white border shadow-lg" style={{ borderColor: `${accentColor}30`, boxShadow: `0 4px 20px ${accentColor}15, inset 0 1px 0 ${accentColor}20` }}>
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.05)] to-transparent" />
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`, border: `1px solid ${accentColor}40` }}>
            <Icon className="w-6 h-6" style={{ color: accentColor }} strokeWidth={1.5} />
          </div>
          <p className="font-bold text-sm uppercase tracking-widest relative z-10" style={{ color: "#8B1A1A" }}>{label}</p>
          <p className="text-[10px] mt-0.5 uppercase tracking-widest relative z-10" style={{ color: `${accentColor}80` }}>{subLabel}</p>
          <div className="mt-2 flex items-center justify-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accentColor }}>
            Enter <ArrowRight className="w-3 h-3" />
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
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF5EB 0%, #FFEDD5 50%, #FFF5EB 100%)", border: "2px solid #FF9933", boxShadow: "0 4px 24px rgba(255,153,51,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #FF9933, #D2691E, #FF9933)" }} />
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF9933, #D2691E)" }}>
                <Quote className="w-4 h-4 text-white" />
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
                  <p className="text-lg sm:text-xl font-serif font-bold leading-snug" style={{ color: "#8B1A1A" }}>
                    {q.text}
                  </p>
                  <p className="text-sm mt-1 font-medium" style={{ color: "#A0522D" }}>
                    {q.sub}
                  </p>
                  <p className="text-[10px] mt-2 uppercase tracking-wider font-bold" style={{ color: "#FF9933" }}>
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
                  background: i === idx ? "#FF9933" : "rgba(255,153,51,0.2)",
                  boxShadow: i === idx ? "0 0 8px rgba(255,153,51,0.5)" : "none",
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
        <Newspaper className="w-4 h-4" style={{ color: "#D2691E" }} />
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: "#D2691E" }}>Live Legal Updates · India</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #FF9933, transparent)" }} />
      </div>

      <div className="rounded-2xl overflow-hidden bg-white border shadow-lg" style={{ borderColor: "#FF993320", boxShadow: "0 8px 32px rgba(139,26,26,0.08)" }}>
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
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(255,248,240,0.95), rgba(255,248,240,0.3), transparent)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(255,248,240,0.4), transparent)" }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="absolute bottom-0 left-0 right-0 p-5 sm:p-7"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded text-white mb-3 shadow-lg" style={{ background: item.tagColor }}>{item.tag}</span>
              <h3 className="text-base sm:text-xl font-bold leading-snug mb-2" style={{ color: "#4a1a1a" }}>{item.title}</h3>
              <p className="text-xs" style={{ color: "#8B5A2B" }}>{item.source} · {item.date}</p>
            </motion.div>
          </AnimatePresence>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border" style={{ borderColor: "#FF993330" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "#8B1A1A" }}>Live</span>
          </div>
        </div>

        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide bg-white/50">
          {legalNews.map((n, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative flex-shrink-0 w-14 h-10 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all duration-300 group/thumb"
              style={{ border: i === active ? "2px solid #FF9933" : "2px solid transparent", opacity: i === active ? 1 : 0.4, boxShadow: i === active ? "0 0 12px rgba(255,153,51,0.3)" : "none" }}
            >
              <img src={n.img} alt="" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300" />
              {i === active && <div className="absolute inset-0" style={{ background: "rgba(255,153,51,0.1)" }} />}
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
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#FFF8F0] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#FFF8F0] to-transparent z-10" />
      <div className="flex animate-marquee whitespace-nowrap">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="mx-6 text-[10px] uppercase tracking-[0.3em] font-semibold flex items-center gap-3" style={{ color: "#D2691E" }}>
            {item}
            <span style={{ color: "#FF9933" }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: "linear-gradient(180deg, #FFF8F0 0%, #FFEDD5 40%, #FFF5EB 100%)" }}>
      {/* Warm background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px]" style={{ background: "rgba(255,153,51,0.12)" }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "rgba(139,26,26,0.06)" }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: "rgba(210,105,30,0.08)" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #FF9933 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
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
            <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none font-serif" style={{ color: "#8B1A1A" }}>
              LC
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#D2691E] to-transparent" />
            <div className="text-left">
              <div className="text-base sm:text-xl font-black tracking-wider leading-tight font-serif" style={{ color: "#8B1A1A" }}>
                LEGAL CONNECT
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center mt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D2691E]" />
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: "#D2691E" }}>Rishika Nagpal & Associates · Advocates & Consultants</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D2691E]" />
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
              <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" idx={0} accentColor="#D2691E" />
              <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" idx={1} accentColor="#8B1A1A" />
              <PortalCard href="/intern" icon={BookOpen} label="Learn" subLabel="& Rise" idx={2} accentColor="#2E8B57" />
              <PortalCard href="/client/cases" icon={Landmark} label="eCourt" subLabel="Services" idx={3} accentColor="#1E3A5C" />
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
                  <button className="text-[10px] tracking-wide transition-colors flex items-center gap-1 group bg-transparent border-none cursor-pointer hover:text-[#8B1A1A]" style={{ color: "#D2691E" }}>
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
              <p className="text-[10px] tracking-[0.2em] uppercase font-bold" style={{ color: "#D2691E" }}>धर्मो रक्षति रक्षितः</p>
              <p className="text-[9px] mt-0.5 tracking-widest" style={{ color: "#D2691E" }}>Dharmo Rakshati Rakshitah</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <LiveNewsPanel />
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-5 border-t" style={{ borderColor: "#FF993320" }}>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "#D2691E" }}
        >
          Subhash Nagar, New Delhi · Est. 2018 · Delhi High Court & Supreme Court
        </motion.p>
      </div>
    </div>
  );
}
