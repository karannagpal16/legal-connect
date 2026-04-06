import { Link } from "wouter";
import { Scale, Gavel, BookOpen, ArrowRight, ChevronRight, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const quotes = [
  {
    sanskrit: "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥",
    english: "Whenever righteousness declines and unrighteousness rises — I descend Myself.",
    source: "Bhagavad Gita 4:7",
  },
  {
    sanskrit: "परित्राणाय साधूनां विनाशाय च दुष्कृताम् ।\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे ॥",
    english: "For the protection of the good, destruction of the wicked, and establishment of Dharma — I manifest in every age.",
    source: "Bhagavad Gita 4:8",
  },
  {
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥",
    english: "You have a right to perform your duty, but never to its fruits. Let not the fruit of action be your motive.",
    source: "Bhagavad Gita 2:47",
  },
  {
    sanskrit: "यतो धर्मस्ततो जयः",
    english: "Where there is Dharma, there is victory.",
    source: "Mahabharata",
  },
  {
    sanskrit: "अहिंसा परमो धर्मः धर्म हिंसा तथैव च ।",
    english: "Non-violence is the highest Dharma, and so is righteous defence of justice.",
    source: "Mahabharata, Adi Parva",
  },
  {
    sanskrit: "सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः",
    english: "Truth alone triumphs, not falsehood. Through truth, the divine path is spread out.",
    source: "Mundaka Upanishad 3:1:6",
  },
  {
    sanskrit: "धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः ।",
    english: "Dharma destroys those who destroy it; Dharma protects those who protect it.",
    source: "Manusmriti 8:15",
  },
  {
    sanskrit: "न जातु कामान्न भयान्न लोभाद् धर्मं त्यजेज्जीवितस्यापि हेतोः ।",
    english: "One should never abandon Dharma out of desire, fear, or greed — not even for the sake of one's life.",
    source: "Mahabharata, Udyoga Parva",
  },
];

const legalNews = [
  { tag: "SC", tagColor: "#ef4444", title: "Supreme Court upholds Right to Privacy as Fundamental Right in digital data case", source: "Supreme Court", date: "Apr 2026" },
  { tag: "HC", tagColor: "#3b82f6", title: "Delhi HC directs expedited hearing for 2.3 lakh pending matrimonial cases under Fast Track scheme", source: "Delhi HC", date: "Apr 2026" },
  { tag: "LAW", tagColor: "#22c55e", title: "Digital Personal Data Protection Rules 2025 notified — consent framework to go live June 2026", source: "MeitY", date: "Mar 2026" },
  { tag: "SC", tagColor: "#ef4444", title: "All High Courts must display cause lists 48 hrs in advance, opens portal for live order access", source: "Supreme Court", date: "Mar 2026" },
  { tag: "NEW", tagColor: "#f59e0b", title: "Bharatiya Nyaya Sanhita 2023 fully operative — IPC repealed across all 28 states", source: "MHA", date: "Feb 2026" },
  { tag: "HC", tagColor: "#3b82f6", title: "High Court mandates e-filing for all civil suits above ₹10 lakh — paperless courts by 2027", source: "Delhi HC", date: "Feb 2026" },
  { tag: "SC", tagColor: "#ef4444", title: "SC expands Legal Aid to include free online consultations for below poverty line citizens", source: "Supreme Court", date: "Jan 2026" },
  { tag: "LAW", tagColor: "#22c55e", title: "Mediation Act 2023 rules notified — mandatory pre-litigation mediation for commercial disputes", source: "Law Ministry", date: "Jan 2026" },
];

function DharmaChakra({ size = 120 }: { size?: number }) {
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
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#b8860b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ckGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d078" />
          <stop offset="40%" stopColor="#d4af37" />
          <stop offset="70%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#f5d078" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#ckGlow)" />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="url(#ckGold)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={outerR - 4} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.3" />
      <circle cx={cx} cy={cy} r={innerRingR} fill="none" stroke="url(#ckGold)" strokeWidth="1" opacity="0.4" />
      <circle cx={cx} cy={cy} r={hubR} fill="url(#ckGold)" />
      <circle cx={cx} cy={cy} r={hubR * 0.6} fill="#030d2e" />
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

function PortalCard({ href, icon: Icon, label, subLabel }: { href: string; icon: React.ElementType; label: string; subLabel: string }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ y: -6, scale: 1.03 }} whileTap={{ scale: 0.97 }} className="group relative cursor-pointer">
        <div className="absolute -inset-1 bg-gradient-to-b from-[#d4af37]/25 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative rounded-2xl p-5 text-center transition-all duration-300" style={{ background: "linear-gradient(160deg, rgba(30,55,110,0.92) 0%, rgba(15,28,70,0.96) 100%)", border: "1.5px solid rgba(212,175,55,0.5)", boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.3)" }}>
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(184,134,11,0.06) 100%)", border: "1px solid rgba(212,175,55,0.35)" }}>
            <Icon className="w-6 h-6 text-[#d4af37]" strokeWidth={1.5} />
          </div>
          <p className="text-[#f5d078] font-bold text-sm uppercase tracking-widest">{label}</p>
          <p className="text-[#d4af37]/45 text-[10px] mt-0.5 uppercase tracking-widest">{subLabel}</p>
          <div className="mt-2 flex items-center justify-center gap-1 text-[#d4af37]/40 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Enter <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function QuotesBox() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % quotes.length), 5000);
    return () => clearInterval(t);
  }, []);
  const q = quotes[idx];
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="absolute -inset-2 bg-gradient-to-b from-[#d4af37]/15 to-transparent rounded-3xl blur-2xl pointer-events-none" />
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(6,14,36,0.95) 0%, rgba(3,10,26,0.98) 100%)", border: "1.5px solid rgba(212,175,55,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.2)" }}>
        <div className="px-6 pt-5 pb-2 flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full border border-[#d4af37]/50 flex items-center justify-center bg-[#d4af37]/10">
            <Scale className="w-3 h-3 text-[#d4af37]" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/60 font-semibold">Words of Dharma</span>
        </div>
        <div className="px-6 py-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
            <div className="text-[#d4af37]/30 text-[8px]">✦</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
          </div>
        </div>
        <div className="px-6 min-h-[180px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5 }}>
              <div className="text-center mb-3">
                {q.sanskrit.split("\n").map((line, i) => (
                  <p key={i} className="text-[#f5d078]/85 text-[11px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>{line}</p>
                ))}
              </div>
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent" />
              </div>
              <p className="text-center text-[#d4af37]/55 text-[10px] leading-relaxed italic">"{q.english}"</p>
              <p className="text-center text-[#d4af37]/35 text-[9px] mt-2 uppercase tracking-widest">— {q.source} —</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex justify-center gap-1.5 pb-4 pt-2">
          {quotes.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className="w-1.5 h-1.5 rounded-full transition-all duration-300" style={{ background: i === idx ? "#d4af37" : "rgba(212,175,55,0.2)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveNewsPanel() {
  const [activeRow, setActiveRow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveRow(p => (p + 1) % legalNews.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <Newspaper className="w-4 h-4 text-[#d4af37]/70" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#d4af37]/70 font-bold">Live Legal Updates · India</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/20 to-transparent" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(6,14,36,0.8)", border: "1px solid rgba(212,175,55,0.15)" }}>
        {legalNews.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 transition-all duration-500" style={{ background: i === activeRow ? "rgba(212,175,55,0.06)" : "transparent", borderBottom: i < legalNews.length - 1 ? "1px solid rgba(212,175,55,0.07)" : "none" }}>
            <span className="flex-shrink-0 mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded text-white" style={{ background: item.tagColor }}>{item.tag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm leading-snug">{item.title}</p>
              <p className="text-white/30 text-[11px] mt-1">{item.source} · {item.date}</p>
            </div>
            {i === activeRow && <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-2 flex-shrink-0 animate-pulse" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function PeacockFeather({ size = 1 }: { size?: number }) {
  const w = 120 * size, h = 200 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 120 200" className="opacity-75">
      <path d="M60 200 Q58 140 56 100 Q54 60 60 10" stroke="url(#pfGrad)" strokeWidth="1.5" fill="none" />
      {Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13;
        const y = 200 - t * 180;
        const x = 56 + t * 4;
        const spread = 8 + t * 40;
        const curve = 20 + t * 30;
        return (
          <g key={i}>
            <path d={`M${x} ${y} Q${x - spread * 0.4} ${y - curve * 0.5} ${x - spread} ${y - curve}`} stroke={t > 0.5 ? "url(#pfBarb1)" : "url(#pfBarb2)"} strokeWidth={t > 0.6 ? "1.2" : "0.8"} fill="none" opacity={0.35 + t * 0.6} />
            <path d={`M${x} ${y} Q${x + spread * 0.4} ${y - curve * 0.5} ${x + spread} ${y - curve}`} stroke={t > 0.5 ? "url(#pfBarb1)" : "url(#pfBarb3)"} strokeWidth={t > 0.6 ? "1.2" : "0.8"} fill="none" opacity={0.35 + t * 0.6} />
          </g>
        );
      })}
      <ellipse cx="60" cy="22" rx="10" ry="15" fill="url(#pfEye)" opacity="0.85" />
      <ellipse cx="60" cy="22" rx="6" ry="9" fill="#1a0a4a" />
      <ellipse cx="60" cy="22" rx="3.5" ry="5" fill="#3d2080" />
      <ellipse cx="60" cy="22" rx="1.8" ry="2.5" fill="#6040c0" />
      <ellipse cx="59" cy="21" rx="0.8" ry="1" fill="rgba(255,255,255,0.5)" />
      <defs>
        <linearGradient id="pfGrad"><stop offset="0%" stopColor="#d4af37" /><stop offset="100%" stopColor="#8B6914" /></linearGradient>
        <linearGradient id="pfBarb1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1a8a6a" /><stop offset="50%" stopColor="#2563eb" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="pfBarb2"><stop offset="0%" stopColor="#065f46" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
        <linearGradient id="pfBarb3"><stop offset="0%" stopColor="#1d4ed8" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        <radialGradient id="pfEye"><stop offset="0%" stopColor="#60a5fa" /><stop offset="40%" stopColor="#2563eb" /><stop offset="70%" stopColor="#1a5c3a" /><stop offset="100%" stopColor="#d4af37" /></radialGradient>
      </defs>
    </svg>
  );
}

function FloorTiles() {
  return (
    <div className="relative w-full h-32 overflow-hidden pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.03) 100%)" }}>
      <svg width="100%" height="100%" viewBox="0 0 800 120" preserveAspectRatio="none">
        <defs>
          <pattern id="floorGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="120" fill="url(#floorGrid)" />
      </svg>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: "radial-gradient(ellipse 120% 80% at 50% 0%, #0d1a3a 0%, #060e24 40%, #030a16 100%)" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#d4af37]/5 blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-blue-900/20 blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #d4af37 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }}>
          <DharmaChakra size={100} />
        </motion.div>

        <div className="text-center px-6 mt-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none" style={{ background: "linear-gradient(135deg, #f5d078 0%, #d4af37 40%, #b8860b 70%, #f5d078 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "serif", filter: "drop-shadow(0 2px 8px rgba(212,175,55,0.4))" }}>
              RN
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#d4af37]/40 to-transparent" />
            <div className="text-left">
              <div className="text-base sm:text-xl font-black tracking-wider leading-tight" style={{ background: "linear-gradient(135deg, #f5d078, #d4af37, #b8860b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "serif" }}>
                RISHIKA NAGPAL &<br />ASSOCIATES
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
            <p className="text-[#d4af37]/55 text-[10px] sm:text-xs tracking-[0.3em] uppercase font-semibold">Advocates & Consultants</p>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <p className="text-[#d4af37]/50 text-[10px] tracking-[0.35em] uppercase font-semibold mb-3">Enter Your Portal</p>
              <div className="flex items-center gap-3 justify-center mb-4">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/50" />
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/40" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto w-full">
              <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" />
              <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" />
              <PortalCard href="/intern" icon={BookOpen} label="Knowledge" subLabel="Base" />
            </div>

            <QuotesBox />

            <div className="text-center">
              <p className="text-[#d4af37]/40 text-[10px] tracking-[0.2em] uppercase">धर्मो रक्षति रक्षितः</p>
              <p className="text-[#d4af37]/25 text-[9px] mt-0.5 tracking-widest">Dharmo Rakshati Rakshitah</p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {[
                { label: "Wellness Quiz", href: "/client/wellness" },
                { label: "Know Your Rights", href: "/client/rights" },
                { label: "Connect Advocate", href: "/client/connect" },
                { label: "Case Tracker", href: "/client/cases" },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <button className="text-[#d4af37]/30 hover:text-[#d4af37]/65 text-[10px] tracking-wide transition-colors flex items-center gap-1 group bg-transparent border-none cursor-pointer">
                    {l.label} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex self-end pb-2">
            <PeacockFeather size={0.75} />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <LiveNewsPanel />
      </div>

      <FloorTiles />

      <div className="relative z-10 text-center py-4 border-t border-[#d4af37]/10">
        <p className="text-[#d4af37]/20 text-[10px] tracking-[0.3em] uppercase">
          Subhash Nagar, New Delhi · Est. 2018 · Delhi High Court & Supreme Court
        </p>
      </div>
    </div>
  );
}
