import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Scale, Gavel, BookOpen, ArrowRight, Newspaper, Radio, ExternalLink } from "lucide-react";

/* ═══════════════════════════════════════════════
   DHARMA CHAKRA — ornate sun-wheel, embossed 3D
═══════════════════════════════════════════════ */
function DharmaChakra({ size = 160 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer warm glow halo */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ inset: "-60%", background: "radial-gradient(ellipse, rgba(255,180,30,0.22) 0%, rgba(212,140,20,0.12) 35%, transparent 65%)" }} />
      <div className="absolute rounded-full pointer-events-none"
        style={{ inset: "-30%", background: "radial-gradient(ellipse, rgba(255,200,60,0.15) 0%, transparent 65%)" }} />
      <svg width={size} height={size} viewBox="0 0 160 160">
        <defs>
          <radialGradient id="ckg" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fff8d0" />
            <stop offset="20%" stopColor="#f5d470" />
            <stop offset="50%" stopColor="#c9950a" />
            <stop offset="80%" stopColor="#8B6200" />
            <stop offset="100%" stopColor="#5a3e00" />
          </radialGradient>
          <radialGradient id="hubkg" cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#fff8dc" />
            <stop offset="35%" stopColor="#f5d070" />
            <stop offset="75%" stopColor="#9a7010" />
            <stop offset="100%" stopColor="#5c3e00" />
          </radialGradient>
          <radialGradient id="sunkg" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fffbe0" />
            <stop offset="30%" stopColor="#ffd84a" />
            <stop offset="65%" stopColor="#d4900a" />
            <stop offset="100%" stopColor="#7a5200" />
          </radialGradient>
          <filter id="chakraGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="0.8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Outer decorative halo ring ── */}
        <circle cx="80" cy="80" r="77" fill="none" stroke="url(#ckg)" strokeWidth="0.5" opacity="0.4" />

        {/* ── 16 outer flame-spokes radiating from beyond rim ── */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * 22.5 - 90) * (Math.PI / 180);
          const inner = 67, outer = 78;
          const x1 = 80 + inner * Math.cos(a), y1 = 80 + inner * Math.sin(a);
          const x2 = 80 + outer * Math.cos(a), y2 = 80 + outer * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#ckg)" strokeWidth={i % 2 === 0 ? "2" : "1"} strokeLinecap="round" opacity={i % 2 === 0 ? "0.9" : "0.5"} />;
        })}

        {/* ── Outer thick rim ── */}
        <circle cx="80" cy="80" r="66" fill="none" stroke="url(#ckg)" strokeWidth="6" />
        {/* ── Inner rim ring ── */}
        <circle cx="80" cy="80" r="60" fill="none" stroke="url(#ckg)" strokeWidth="1.2" opacity="0.6" />
        <circle cx="80" cy="80" r="58.5" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />

        {/* ── 24 wheel spokes ── */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = ((i * 15) - 90) * (Math.PI / 180);
          const x1 = 80 + 14 * Math.cos(a), y1 = 80 + 14 * Math.sin(a);
          const x2 = 80 + 59 * Math.cos(a), y2 = 80 + 59 * Math.sin(a);
          const major = i % 3 === 0;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="url(#ckg)" strokeWidth={major ? "2.2" : "1"}
              strokeLinecap="round" opacity={major ? 1 : 0.65}
              filter={major ? "url(#softGlow)" : undefined} />
          );
        })}

        {/* ── 24 rim dots ── */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = ((i * 15) - 90) * (Math.PI / 180);
          const r = 63.5;
          return <circle key={i} cx={80 + r * Math.cos(a)} cy={80 + r * Math.sin(a)} r={i % 3 === 0 ? 2.2 : 1.1} fill="url(#ckg)" opacity={i % 3 === 0 ? 1 : 0.55} />;
        })}

        {/* ── Sun-face center medallion ── */}
        {/* 8 sun rays behind hub */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 - 90) * (Math.PI / 180);
          const x1 = 80 + 10 * Math.cos(a), y1 = 80 + 10 * Math.sin(a);
          const x2 = 80 + 22 * Math.cos(a), y2 = 80 + 22 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#sunkg)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />;
        })}
        {/* 8 diagonal smaller rays */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 - 67.5) * (Math.PI / 180);
          const x1 = 80 + 10 * Math.cos(a), y1 = 80 + 10 * Math.sin(a);
          const x2 = 80 + 18 * Math.cos(a), y2 = 80 + 18 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#sunkg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />;
        })}

        {/* Hub outer ring */}
        <circle cx="80" cy="80" r="14" fill="url(#hubkg)" />
        <circle cx="80" cy="80" r="10" fill="#0a0d22" />
        {/* Hub inner gold disc */}
        <circle cx="80" cy="80" r="7" fill="url(#sunkg)" />
        {/* Face detail */}
        <circle cx="80" cy="80" r="4" fill="#080b1e" />
        <circle cx="80" cy="80" r="2" fill="url(#sunkg)" />
        {/* Specular */}
        <circle cx="78.5" cy="78.5" r="1" fill="rgba(255,255,255,0.65)" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ROTATING SHLOKAS
═══════════════════════════════════════════════ */
const SHLOKAS = [
  {
    id: 1,
    lines: ["यदा यदा हि धर्मस्य", "ग्लानिर्भवति भारत ।", "अभ्युत्थानमधर्मस्य", "तदात्मानं सृजाम्यहम् ॥"],
    ref: "Bhagavad Gita · 4:7",
    en: "Whenever righteousness declines and unrighteousness rises — I descend Myself.",
  },
  {
    id: 2,
    lines: ["परित्राणाय साधूनां", "विनाशाय च दुष्कृताम् ।", "धर्मसंस्थापनार्थाय", "सम्भवामि युगे युगे ॥"],
    ref: "Bhagavad Gita · 4:8",
    en: "For protection of the good, destruction of the wicked, and establishment of Dharma — I manifest in every age.",
  },
  {
    id: 3,
    lines: ["कर्मण्येवाधिकारस्ते", "मा फलेषु कदाचन ।", "मा कर्मफलहेतुर्भूः", "मा ते सङ्गोऽस्त्वकर्मणि ॥"],
    ref: "Bhagavad Gita · 2:47",
    en: "You have a right to perform your duty, but never to claim its fruits. Let not the fruits of action be your motive.",
  },
  {
    id: 4,
    lines: ["सत्यमेव जयते", "नानृतम् ।", "सत्येन पन्था विततो", "देवयानः ॥"],
    ref: "Mundaka Upanishad · 3:1:6",
    en: "Truth alone triumphs, not falsehood. Through truth the divine path is spread out.",
  },
  {
    id: 5,
    lines: ["धर्मो रक्षति", "रक्षितः ।", "धर्मं न रक्षन्तं", "नाशयते धर्मः ॥"],
    ref: "Manusmriti · 8:15",
    en: "Dharma protects those who protect it. Dharma destroys those who destroy it.",
  },
];

/* ═══════════════════════════════════════════════
   PHONE MOCKUP
═══════════════════════════════════════════════ */
function PhoneMockup() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % SHLOKAS.length), 4500);
    return () => clearInterval(t);
  }, []);
  const s = SHLOKAS[idx];
  return (
    <div className="relative" style={{ width: 195 }}>
      {/* Phone ambient glow */}
      <div className="absolute pointer-events-none" style={{ inset: "-40px", background: "radial-gradient(ellipse 70% 80% at 50% 55%, rgba(212,175,55,0.14), transparent 70%)" }} />
      {/* Shell */}
      <div className="relative rounded-[36px] overflow-visible"
        style={{
          width: 195, background: "linear-gradient(170deg,#1e1e32,#0c0e1e,#060810)",
          boxShadow: "0 0 0 1.5px rgba(212,175,55,0.2), 0 0 0 5px #08091a, 0 0 0 6.5px rgba(212,175,55,0.12), 0 30px 90px rgba(0,0,0,0.95), 4px 0 16px rgba(0,0,0,0.6)",
        }}>
        {/* Power button */}
        <div className="absolute -right-[3px] top-24 w-[3px] h-10 rounded-r" style={{ background: "linear-gradient(#2a2a42,#181828)" }} />
        {/* Volume buttons */}
        <div className="absolute -left-[3px] top-20 w-[3px] h-7 rounded-l" style={{ background: "linear-gradient(#2a2a42,#181828)" }} />
        <div className="absolute -left-[3px] top-32 w-[3px] h-7 rounded-l" style={{ background: "linear-gradient(#2a2a42,#181828)" }} />

        {/* Notch */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[68px] h-[22px] rounded-full z-20 flex items-center justify-center gap-2" style={{ background: "#060810" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#1a1a2e" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "#252538" }} />
        </div>

        {/* Screen */}
        <div className="mx-[7px] mt-[7px] mb-[7px] rounded-[29px] overflow-hidden flex flex-col" style={{ minHeight: 430, background: "linear-gradient(175deg,#04081a 0%,#020510 100%)" }}>
          {/* Status bar */}
          <div className="flex justify-between px-5 pt-7 pb-0">
            <span style={{ fontSize: 8, color: "rgba(212,175,55,0.4)", fontFamily: "monospace" }}>9:41</span>
            <span style={{ fontSize: 7, color: "rgba(212,175,55,0.25)", letterSpacing: 2 }}>● ● ●</span>
          </div>

          {/* Screen content: scroll parchment style */}
          <div className="flex-1 flex flex-col items-center px-4 pt-2 pb-4">
            {/* Scroll top decoration */}
            <div className="w-full flex flex-col items-center mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2), rgba(212,175,55,0.04))", border: "1px solid rgba(212,175,55,0.45)" }}>
                <Scale style={{ width: 14, height: 14, color: "#d4af37" }} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.55)", fontWeight: 700, textTransform: "uppercase" }}>Legal Portal</p>
              <p style={{ fontSize: 10, color: "rgba(245,208,120,0.8)", fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: 1 }}>Rishika Nagpal & Associates</p>
            </div>

            {/* Gold rule */}
            <div className="w-full flex items-center gap-1.5 mb-3">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5))" }} />
              <span style={{ color: "rgba(212,175,55,0.5)", fontSize: 8 }}>✦</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.5))" }} />
            </div>

            {/* Rotating shloka */}
            <div className="flex-1 flex flex-col justify-center w-full">
              <AnimatePresence mode="wait">
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.55 }} className="text-center">
                  <div className="mb-2.5 space-y-0.5">
                    {s.lines.map((l, i) => (
                      <p key={i} style={{ fontSize: 9.5, color: "rgba(245,208,120,0.92)", fontFamily: "Georgia,serif", lineHeight: 1.5 }}>{l}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 justify-center my-2.5">
                    <div className="h-px w-7" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4))" }} />
                    <div className="w-1 h-1 rounded-full" style={{ background: "rgba(212,175,55,0.4)" }} />
                    <div className="h-px w-7" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.4))" }} />
                  </div>
                  <p style={{ fontSize: 7.5, color: "rgba(212,175,55,0.62)", fontStyle: "italic", lineHeight: 1.5, padding: "0 4px" }}>"{s.en}"</p>
                  <p style={{ fontSize: 7, color: "rgba(212,175,55,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 6 }}>— {s.ref} —</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot progress */}
            <div className="flex justify-center gap-1 mt-2">
              {SHLOKAS.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === idx ? 12 : 4, height: 4, background: i === idx ? "rgba(212,175,55,0.8)" : "rgba(212,175,55,0.22)" }} />
              ))}
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center py-2.5">
          <div className="w-20 h-[3px] rounded-full" style={{ background: "rgba(212,175,55,0.18)" }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PORTAL CARD — stone slab style
═══════════════════════════════════════════════ */
function PortalCard({ href, label, subLabel, icon: Icon, emoji }: { href: string; label: string; subLabel: string; icon?: React.ElementType; emoji?: string }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ y: -10, scale: 1.05 }} whileTap={{ scale: 0.96 }}
        className="relative cursor-pointer group" style={{ width: 120 }}>
        {/* Card glow on hover */}
        <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 blur-lg pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.35), transparent 70%)" }} />
        {/* Stone slab body */}
        <div className="relative rounded-xl flex flex-col items-center"
          style={{
            background: "linear-gradient(170deg, rgba(40,50,90,0.98) 0%, rgba(20,28,60,0.99) 50%, rgba(10,15,38,1) 100%)",
            border: "1px solid rgba(212,175,55,0.45)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.3), inset 0 0 30px rgba(212,175,55,0.03), 0 0 0 0.5px rgba(212,175,55,0.1)",
            padding: "18px 12px 14px",
          }}>
          {/* Top shimmer */}
          <div className="absolute top-0 inset-x-4 h-px rounded-full" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.7), transparent)" }} />
          {/* Icon area — bronze medallion */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "radial-gradient(circle at 38% 32%, rgba(212,175,55,0.35), rgba(140,100,10,0.15) 60%, rgba(80,55,5,0.1))",
              border: "1.5px solid rgba(212,175,55,0.55)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.12)",
            }}>
            {emoji ? (
              <span style={{ fontSize: 22 }}>{emoji}</span>
            ) : (
              <Icon className="w-7 h-7" style={{ color: "#d4af37" }} strokeWidth={1.2} />
            )}
          </div>
          {/* Label */}
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f5d078", textAlign: "center", lineHeight: 1.3 }}>{label}</p>
          <p style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(212,175,55,0.45)", textAlign: "center", marginTop: 2 }}>{subLabel}</p>
          {/* Bottom shimmer */}
          <div className="absolute bottom-0 inset-x-4 h-px rounded-full" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3), transparent)" }} />
        </div>
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════
   REALISTIC PEACOCK FEATHER
═══════════════════════════════════════════════ */
function PeacockFeather({ size = 1 }: { size?: number }) {
  const w = 220 * size, h = 380 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 220 380" style={{ filter: "drop-shadow(0 8px 30px rgba(0,80,180,0.35)) drop-shadow(0 0 15px rgba(0,150,100,0.2))" }}>
      <defs>
        <linearGradient id="pq" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#c9a227" /><stop offset="100%" stopColor="#6b4e0a" /></linearGradient>
        <linearGradient id="pb1" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#064e3b" /><stop offset="35%" stopColor="#0d9488" /><stop offset="65%" stopColor="#2563eb" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="pb2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#065f46" /><stop offset="50%" stopColor="#1e40af" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient>
        <linearGradient id="pb3" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#064e3b" /><stop offset="50%" stopColor="#1e3a8a" /><stop offset="100%" stopColor="#4c1d95" /></linearGradient>
        <radialGradient id="eye1"><stop offset="0%" stopColor="#bfdbfe" /><stop offset="25%" stopColor="#60a5fa" /><stop offset="50%" stopColor="#1d4ed8" /><stop offset="72%" stopColor="#065f46" /><stop offset="90%" stopColor="#c9a227" /><stop offset="100%" stopColor="#78350f" /></radialGradient>
        <radialGradient id="eye2"><stop offset="0%" stopColor="#93c5fd" /><stop offset="40%" stopColor="#1e40af" /><stop offset="100%" stopColor="#0d1a3a" /></radialGradient>
      </defs>
      {/* Quill */}
      <path d="M110 380 Q107 300 104 230 Q100 160 108 50" stroke="url(#pq)" strokeWidth="2.5" fill="none" />
      {/* 22 pairs of barbs */}
      {Array.from({ length: 22 }).map((_, i) => {
        const t = i / 21;
        const y = 370 - t * 295;
        const x = 104 + t * 4;
        const sp = 14 + t * 80;
        const cv = 25 + t * 55;
        const w1 = t > 0.55 ? 1.8 : 1;
        const op = 0.3 + t * 0.7;
        return (
          <g key={i}>
            <path d={`M${x} ${y} Q${x - sp * 0.35} ${y - cv * 0.45} ${x - sp} ${y - cv}`}
              stroke={t > 0.45 ? "url(#pb1)" : "url(#pb2)"} strokeWidth={w1} fill="none" opacity={op} />
            <path d={`M${x} ${y} Q${x + sp * 0.35} ${y - cv * 0.45} ${x + sp} ${y - cv}`}
              stroke={t > 0.45 ? "url(#pb1)" : "url(#pb3)"} strokeWidth={w1} fill="none" opacity={op} />
            {/* Secondary fine barbs */}
            {t > 0.3 && <>
              <path d={`M${x - sp * 0.4} ${y - cv * 0.3} Q${x - sp * 0.65} ${y - cv * 0.55} ${x - sp * 0.85} ${y - cv * 0.75}`}
                stroke="url(#pb2)" strokeWidth="0.5" fill="none" opacity={op * 0.5} />
              <path d={`M${x + sp * 0.4} ${y - cv * 0.3} Q${x + sp * 0.65} ${y - cv * 0.55} ${x + sp * 0.85} ${y - cv * 0.75}`}
                stroke="url(#pb1)" strokeWidth="0.5" fill="none" opacity={op * 0.5} />
            </>}
          </g>
        );
      })}
      {/* Eye of the feather */}
      <ellipse cx="108" cy="55" rx="20" ry="30" fill="url(#eye1)" opacity="0.95" />
      <ellipse cx="108" cy="55" rx="14" ry="21" fill="#0a0f2e" />
      <ellipse cx="108" cy="55" rx="9" ry="13" fill="url(#eye2)" />
      <ellipse cx="108" cy="55" rx="5.5" ry="8" fill="#0d1740" />
      <ellipse cx="108" cy="55" rx="3" ry="4.5" fill="#3730a3" />
      <ellipse cx="108" cy="55" rx="1.5" ry="2" fill="#6d28d9" />
      <ellipse cx="106.5" cy="53" rx="1.2" ry="1.7" fill="rgba(255,255,255,0.6)" />
      {/* Iridescent sheen overlay on barbs */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = 0.5 + (i / 7) * 0.5;
        const y = 370 - t * 295;
        const x = 104 + t * 4;
        const sp = 14 + t * 80;
        const cv = 25 + t * 55;
        return (
          <g key={i} opacity="0.25">
            <path d={`M${x} ${y} Q${x - sp * 0.5} ${y - cv * 0.5} ${x - sp * 0.95} ${y - cv * 0.92}`}
              stroke="rgba(200,230,255,1)" strokeWidth="0.8" fill="none" />
            <path d={`M${x} ${y} Q${x + sp * 0.5} ${y - cv * 0.5} ${x + sp * 0.95} ${y - cv * 0.92}`}
              stroke="rgba(200,230,255,1)" strokeWidth="0.8" fill="none" />
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   FLOOR TILES — dark stone + gold grid
═══════════════════════════════════════════════ */
function FloorTiles() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: 200 }}>
      <svg width="100%" height="200" viewBox="0 0 1280 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="floorBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(3,8,20,0)" />
            <stop offset="40%" stopColor="rgba(5,10,28,0.7)" />
            <stop offset="100%" stopColor="rgba(3,6,16,0.95)" />
          </linearGradient>
          <pattern id="tiles" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="rgba(8,12,30,0.3)" />
            <rect width="98" height="98" x="1" y="1" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="0.5" />
            <rect width="2" height="2" x="49" y="49" fill="rgba(212,175,55,0.1)" />
          </pattern>
          <linearGradient id="tilesFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.04)" />
          </linearGradient>
          {/* Perspective transform for tiles */}
          <linearGradient id="tilesTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.06)" />
          </linearGradient>
        </defs>
        <rect width="1280" height="200" fill="url(#floorBg)" />
        <rect width="1280" height="200" fill="url(#tiles)" opacity="0.9" />
        <rect width="1280" height="200" fill="url(#tilesTop)" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MARBLE TABLE
═══════════════════════════════════════════════ */
function MarbleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center">
      {children}
      {/* Table surface */}
      <div className="relative mt-4 w-full" style={{ height: 18 }}>
        <div className="absolute inset-0 rounded-sm"
          style={{
            background: "linear-gradient(180deg, rgba(30,40,80,0.9) 0%, rgba(18,25,55,0.95) 40%, rgba(10,15,38,0.98) 100%)",
            border: "1px solid rgba(212,175,55,0.4)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.35), inset 0 -1px 0 rgba(212,175,55,0.1)",
          }} />
        {/* Gold trim edge */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] rounded-t-sm"
          style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.7) 20%, rgba(212,175,55,0.9) 50%, rgba(212,175,55,0.7) 80%, transparent)" }} />
      </div>
      {/* Table leg suggestion */}
      <div className="w-[92%] h-2 rounded-b"
        style={{ background: "linear-gradient(180deg, rgba(15,20,50,0.9), rgba(8,12,30,0.95))", borderLeft: "1px solid rgba(212,175,55,0.2)", borderRight: "1px solid rgba(212,175,55,0.2)", borderBottom: "1px solid rgba(212,175,55,0.15)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LIVE LEGAL NEWS
═══════════════════════════════════════════════ */
const NEWS = [
  { tag: "SC", c: "#ef4444", h: "Supreme Court upholds Right to Privacy as Fundamental Right in digital data case", src: "Supreme Court", d: "Apr 2026" },
  { tag: "HC", c: "#f59e0b", h: "Delhi HC directs expedited hearing for 2.3 lakh pending matrimonial cases under Fast Track scheme", src: "Delhi HC", d: "Apr 2026" },
  { tag: "LAW", c: "#22c55e", h: "Digital Personal Data Protection Rules 2025 notified — consent framework to go live June 2026", src: "MeitY", d: "Mar 2026" },
  { tag: "SC", c: "#ef4444", h: "All High Courts must display cause lists 48 hrs in advance, opens portal for live order access", src: "Supreme Court", d: "Mar 2026" },
  { tag: "NEW", c: "#8b5cf6", h: "Bharatiya Nyaya Sanhita 2023 fully operative — IPC repealed across all 28 states", src: "MHA", d: "Feb 2026" },
  { tag: "HC", c: "#f59e0b", h: "Delhi HC: Builders must compensate flat buyers ₹50,000/month for delayed possession", src: "Delhi HC", d: "Feb 2026" },
  { tag: "SC", c: "#ef4444", h: "Accused can't be denied bail solely on media trial — SC orders guidelines for coverage of sub-judice matters", src: "Supreme Court", d: "Jan 2026" },
  { tag: "NEW", c: "#22c55e", h: "Consumer Protection Amendment 2025 — product liability expanded; 30-day return window mandatory", src: "MCA", d: "Dec 2025" },
];

function LiveNews() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % NEWS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(170deg,rgba(12,22,55,0.98),rgba(6,12,36,0.99))", border: "1.5px solid rgba(212,175,55,0.28)", boxShadow: "0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(212,175,55,0.18)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#d4af37]/12"
        style={{ background: "linear-gradient(to right,rgba(212,175,55,0.07),rgba(212,175,55,0.02))" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <Newspaper style={{ width: 12, height: 12, color: "rgba(212,175,55,0.7)" }} />
        <span style={{ fontSize: 9, letterSpacing: "0.28em", fontWeight: 700, color: "rgba(212,175,55,0.75)", textTransform: "uppercase" }}>Live Legal Updates · India</span>
        <Radio style={{ width: 10, height: 10, color: "rgba(212,175,55,0.35)", marginLeft: "auto" }} className="animate-pulse" />
      </div>
      <div>
        {NEWS.map((item, i) => (
          <motion.div key={i}
            animate={{ backgroundColor: i === active ? "rgba(212,175,55,0.055)" : "rgba(0,0,0,0)" }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 px-4 py-2 border-b border-[#d4af37]/06 last:border-0">
            <div className="flex-shrink-0 mt-0.5">
              <span style={{ fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.08em", backgroundColor: `${item.c}18`, color: item.c, border: `1px solid ${item.c}38` }}>{item.tag}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 10, lineHeight: 1.45, color: i === active ? "#f5d078" : "rgba(212,175,55,0.5)", transition: "color 0.3s" }}>{item.h}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: 8, color: "rgba(212,175,55,0.28)" }}>{item.src}</span>
                <span style={{ color: "rgba(212,175,55,0.18)" }}>·</span>
                <span style={{ fontSize: 8, color: "rgba(212,175,55,0.22)" }}>{item.d}</span>
              </div>
            </div>
            {i === active && <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0 animate-pulse" style={{ background: "rgba(212,175,55,0.6)" }} />}
          </motion.div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-[#d4af37]/08 flex items-center justify-between"
        style={{ background: "rgba(212,175,55,0.015)" }}>
        <p style={{ fontSize: 8, color: "rgba(212,175,55,0.2)", fontStyle: "italic" }}>SC · HC · Ministry records · 2025–26</p>
        <Link href="/client/rights">
          <button className="flex items-center gap-0.5 transition-colors" style={{ fontSize: 8, color: "rgba(212,175,55,0.38)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,175,55,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.38)")}>
            Know your rights <ExternalLink style={{ width: 8, height: 8 }} />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════ */
export function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse 160% 100% at 50% -5%, #0e1d48 0%, #060d28 35%, #030818 70%, #010510 100%)" }}>

      {/* ── Atmosphere layers ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Wall texture — subtle noise grain */}
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat" }} />
        {/* Spot light top center */}
        <div className="absolute" style={{ top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(255,190,50,0.1) 0%, rgba(200,140,20,0.06) 30%, transparent 65%)", borderRadius: "50%" }} />
        {/* Left blue ambient */}
        <div className="absolute" style={{ top: "30%", left: "-5%", width: 500, height: 600, background: "radial-gradient(ellipse, rgba(20,60,160,0.14), transparent 70%)" }} />
        {/* Right violet ambient */}
        <div className="absolute" style={{ top: "30%", right: "-5%", width: 450, height: 550, background: "radial-gradient(ellipse, rgba(60,20,140,0.10), transparent 70%)" }} />
        {/* Bottom gold shimmer */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 250, background: "linear-gradient(to top, rgba(212,175,55,0.05), transparent)" }} />
      </div>

      {/* ── SECTION 1: Header (Chakra + Logo) ── */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75 }}
        className="relative z-10 flex flex-col items-center pt-6 pb-4"
      >
        {/* Dharma Chakra */}
        <motion.div className="mb-4" animate={{ rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: "linear" }}>
          <DharmaChakra size={148} />
        </motion.div>

        {/* RN Logo + Firm Name */}
        <div className="flex items-start gap-3 mb-1.5 px-4">
          <div className="relative flex-shrink-0">
            {/* Peacock feather accent above RN */}
            <div className="absolute -top-4 left-0 text-lg leading-none" style={{ filter: "drop-shadow(0 0 4px rgba(0,180,120,0.6))" }}>🪶</div>
            <span style={{ fontSize: "clamp(2.8rem,7vw,4.2rem)", fontFamily: "Georgia,serif", fontWeight: 900, lineHeight: 1, background: "linear-gradient(145deg,#fff8c0 0%,#f5d070 18%,#d4af37 45%,#a07818 72%,#f0cc55 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 3px 14px rgba(212,175,55,0.4))" }}>
              RN
            </span>
          </div>
          <div className="pt-1">
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: "clamp(1rem,2.8vw,1.75rem)", letterSpacing: "0.08em", lineHeight: 1.15, background: "linear-gradient(120deg,#f5e070,#d4af37,#c09020,#f0cc50)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              RISHIKA NAGPAL &
            </div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: "clamp(1rem,2.8vw,1.75rem)", letterSpacing: "0.08em", lineHeight: 1.15, background: "linear-gradient(120deg,#d4af37,#b8900a,#d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ASSOCIATES
            </div>
            <div style={{ fontSize: "clamp(0.6rem,1.5vw,0.85rem)", letterSpacing: "0.32em", color: "rgba(212,175,55,0.55)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>
              Advocates & Consultants
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-1">
          <div className="h-px w-20" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.45))" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "rgba(212,175,55,0.5)" }} />
          <div className="h-px w-20" style={{ background: "linear-gradient(to left, transparent, rgba(212,175,55,0.45))" }} />
        </div>
      </motion.div>

      {/* ── SECTION 2: Phone + Table + Cards ── */}
      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pb-4">
        {/* Grid: [phone] [cards+news] [feather] */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 120px", alignItems: "start", gap: "1.5rem" }}>

          {/* ── Col 1: Phone ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            style={{ transform: "perspective(900px) rotateY(5deg) rotateZ(-2deg)", marginBottom: 24, flexShrink: 0 }}
          >
            <PhoneMockup />
          </motion.div>

          {/* ── Col 2: Cards + News ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>

            {/* Portal cards on marble table */}
            <div>
              <div className="text-center mb-3">
                <p style={{ fontSize: 9, letterSpacing: "0.38em", fontWeight: 700, color: "rgba(212,175,55,0.55)", textTransform: "uppercase" }}>Enter Your Portal</p>
              </div>
              <MarbleTable>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", justifyContent: "center", padding: "0 8px" }}>
                  <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" />
                  <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" />
                  <PortalCard href="/intern" icon={BookOpen} label="Knowledge" subLabel="Base" />
                </div>
              </MarbleTable>
            </div>

            {/* Quick links */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 1rem", justifyContent: "center" }}>
              {[
                { l: "Wellness Quiz", h: "/client/wellness" },
                { l: "Know Your Rights", h: "/client/rights" },
                { l: "Connect Advocate", h: "/client/connect" },
                { l: "Case Tracker", h: "/client/cases" },
              ].map(item => (
                <Link key={item.h} href={item.h}>
                  <button style={{ fontSize: 10, color: "rgba(212,175,55,0.32)", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 2, transition: "color 0.2s", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,175,55,0.7)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.32)")}>
                    {item.l} <ArrowRight style={{ width: 10, height: 10 }} />
                  </button>
                </Link>
              ))}
            </div>

            {/* Dharma tagline */}
            <p style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.25em", color: "rgba(212,175,55,0.3)", textTransform: "uppercase", margin: 0 }}>
              ✦ &nbsp; धर्मो रक्षति रक्षितः &nbsp; ✦
            </p>

            {/* Live news */}
            <div>
              <LiveNews />
            </div>
          </div>

          {/* ── Col 3: Peacock feather ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 1.0 }}
            style={{ flexShrink: 0, alignSelf: "flex-end", marginBottom: -8 }}
          >
            <PeacockFeather size={0.82} />
          </motion.div>
        </div>
      </div>

      {/* ── Floor tiles ── */}
      <FloorTiles />

      {/* ── Footer ── */}
      <div className="relative z-10 text-center py-3 border-t" style={{ borderColor: "rgba(212,175,55,0.07)" }}>
        <p style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.2)", textTransform: "uppercase" }}>
          Subhash Nagar, New Delhi · Est. 2018 · Delhi High Court & Supreme Court
        </p>
      </div>
    </div>
  );
}
