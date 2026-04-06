import { Link } from "wouter";
import { motion } from "framer-motion";
import { Scale, Gavel, BookOpen, ArrowRight, ChevronRight, Star } from "lucide-react";

/* ── Dharma Chakra SVG ── */
function DharmaChakra({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="drop-shadow-[0_0_30px_rgba(212,175,55,0.6)]">
      {/* Outer ring */}
      <circle cx="60" cy="60" r="56" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.4" />
      {/* Inner hub */}
      <circle cx="60" cy="60" r="9" fill="url(#goldGrad)" />
      <circle cx="60" cy="60" r="6" fill="#030d2e" />
      <circle cx="60" cy="60" r="2.5" fill="url(#goldGrad)" />
      {/* 24 spokes */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 60 + 9 * Math.cos(rad), y1 = 60 + 9 * Math.sin(rad);
        const x2 = 60 + 47 * Math.cos(rad), y2 = 60 + 47 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#goldGrad)" strokeWidth={i % 3 === 0 ? "1.5" : "0.7"} opacity={i % 3 === 0 ? "1" : "0.5"} />;
      })}
      {/* Decorative outer dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45) * Math.PI / 180;
        const x = 60 + 54 * Math.cos(angle), y = 60 + 54 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="url(#goldGrad)" />;
      })}
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d078" />
          <stop offset="40%" stopColor="#d4af37" />
          <stop offset="70%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#f5d078" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Phone Mockup ── */
function PhoneMockup() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/20 to-transparent rounded-[40px] blur-3xl scale-110 pointer-events-none" />
      {/* Phone shell */}
      <div className="relative w-[200px] sm:w-[220px] bg-gradient-to-b from-[#1a1a2e] via-[#0d1117] to-[#0a0f20] rounded-[36px] shadow-2xl border border-[#d4af37]/20" style={{ boxShadow: "0 0 0 6px #111827, 0 0 0 7px #d4af3740, 0 30px 80px rgba(0,0,0,0.8)" }}>
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#0d1117] rounded-full z-10 flex items-center justify-center">
          <div className="w-8 h-2 bg-black rounded-full" />
        </div>
        {/* Screen */}
        <div className="mx-[6px] mt-[6px] mb-[6px] bg-gradient-to-b from-[#060e24] to-[#030a1a] rounded-[30px] overflow-hidden min-h-[420px] flex flex-col">
          {/* Scroll/parchment UI */}
          <div className="flex-1 px-5 pt-10 pb-6 flex flex-col">
            {/* Top badge */}
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 rounded-full border border-[#d4af37]/60 flex items-center justify-center bg-[#d4af37]/10">
                <Scale className="w-4 h-4 text-[#d4af37]" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/60 font-semibold mb-1">Legal Portal</div>
              <div className="text-[#d4af37] font-serif text-xs font-bold">Rishika Nagpal & Associates</div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
              <div className="w-1 h-1 rounded-full bg-[#d4af37]/40" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
            </div>

            {/* Sanskrit shloka */}
            <div className="text-center mb-3">
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                यदा यदा हि धर्मस्य
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                ग्लानिर्भवति भारत ।
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                अभ्युत्थानमधर्मस्य
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                तदात्मानं सृजाम्यहम् ॥
              </p>
            </div>
            <div className="text-center mb-3">
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                परित्राणाय साधूनां
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                विनाशाय च दुष्कृताम् ।
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                धर्मसंस्थापनार्थाय
              </p>
              <p className="text-[#f5d078]/90 text-[9px] leading-relaxed font-medium" style={{ fontFamily: "serif" }}>
                सम्भवामि युगे युगे ॥
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
              <div className="text-[#d4af37]/40 text-[8px]">✦</div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
            </div>

            {/* English translation */}
            <div className="text-center space-y-2">
              <p className="text-[#d4af37]/60 text-[7.5px] leading-relaxed italic">
                "Whenever righteousness declines and unrighteousness rises — I descend Myself."
              </p>
              <p className="text-[#d4af37]/60 text-[7.5px] leading-relaxed italic">
                "For the protection of the good, destruction of the wicked, and establishment of Dharma — I manifest in every age."
              </p>
            </div>

            <div className="mt-4 text-center">
              <div className="text-[8px] text-[#d4af37]/40 uppercase tracking-widest">— Bhagavad Gita 4:7–8 —</div>
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="flex justify-center py-3">
          <div className="w-24 h-1 bg-[#d4af37]/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Portal Card ── */
interface PortalCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  subLabel?: string;
  delay?: number;
  emoji?: string;
}

function PortalCard({ href, icon: Icon, label, subLabel, delay = 0, emoji }: PortalCardProps) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8, scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="group relative cursor-pointer"
      >
        {/* Card outer glow on hover */}
        <div className="absolute -inset-1 bg-gradient-to-b from-[#d4af37]/30 to-[#d4af37]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Card body */}
        <div
          className="relative rounded-2xl p-5 text-center transition-all duration-300"
          style={{
            background: "linear-gradient(160deg, rgba(30,55,110,0.92) 0%, rgba(15,28,70,0.96) 100%)",
            border: "1.5px solid rgba(212,175,55,0.55)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.35), inset 0 -1px 0 rgba(212,175,55,0.1), 0 0 12px rgba(212,175,55,0.08)",
          }}
        >
          {/* Shimmer line at top */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent rounded-full" />
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110"
            style={{
              background: "radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(184,134,11,0.08) 100%)",
              border: "1px solid rgba(212,175,55,0.4)",
              boxShadow: "0 0 20px rgba(212,175,55,0.15)"
            }}
          >
            {emoji ? (
              <span className="text-xl">{emoji}</span>
            ) : (
              <Icon className="w-6 h-6 text-[#d4af37]" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-[#f5d078] font-bold text-sm uppercase tracking-widest leading-tight">{label}</p>
          {subLabel && <p className="text-[#d4af37]/50 text-[10px] mt-0.5 uppercase tracking-widest">{subLabel}</p>}
          {/* Arrow */}
          <div className="mt-3 flex items-center justify-center gap-1 text-[#d4af37]/50 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Enter <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ── Peacock Feather SVG ── */
function PeacockFeather() {
  return (
    <svg width="180" height="280" viewBox="0 0 180 280" className="opacity-80 drop-shadow-[0_0_20px_rgba(0,100,200,0.3)]">
      {/* Main quill */}
      <path d="M90 280 Q88 200 85 150 Q82 100 90 20" stroke="url(#featherGrad)" strokeWidth="2" fill="none" />
      {/* Barbs */}
      {Array.from({ length: 18 }).map((_, i) => {
        const t = i / 17;
        const y = 280 - t * 240;
        const x = 85 + t * 5;
        const spread = 12 + t * 55;
        const curvature = 30 + t * 40;
        return (
          <g key={i}>
            <path d={`M${x} ${y} Q${x - spread * 0.4} ${y - curvature * 0.5} ${x - spread} ${y - curvature}`} stroke={t > 0.5 ? "url(#barb1)" : "url(#barb2)"} strokeWidth={t > 0.6 ? "1.5" : "1"} fill="none" opacity={0.4 + t * 0.6} />
            <path d={`M${x} ${y} Q${x + spread * 0.4} ${y - curvature * 0.5} ${x + spread} ${y - curvature}`} stroke={t > 0.5 ? "url(#barb1)" : "url(#barb3)"} strokeWidth={t > 0.6 ? "1.5" : "1"} fill="none" opacity={0.4 + t * 0.6} />
          </g>
        );
      })}
      {/* Eye */}
      <ellipse cx="90" cy="34" rx="14" ry="20" fill="url(#eyeGrad)" opacity="0.9" />
      <ellipse cx="90" cy="34" rx="9" ry="13" fill="#1a0a4a" />
      <ellipse cx="90" cy="34" rx="5" ry="7" fill="#3d2080" />
      <ellipse cx="90" cy="34" rx="2.5" ry="3.5" fill="#6040c0" />
      <ellipse cx="88.5" cy="32.5" rx="1.2" ry="1.5" fill="rgba(255,255,255,0.5)" />
      <defs>
        <linearGradient id="featherGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="barb1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a8a6a" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="barb2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="barb3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="eyeGrad">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="40%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#1a5c3a" />
          <stop offset="100%" stopColor="#d4af37" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Floor grid ── */
function FloorGrid() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.05)" />
          </linearGradient>
        </defs>
        <rect width="800" height="200" fill="url(#grid)" />
        <rect width="800" height="200" fill="url(#floorFade)" />
      </svg>
    </div>
  );
}

/* ── Main Component ── */
export function Home() {
  const mounted = true;

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden relative"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 0%, #0d1a3a 0%, #060e24 40%, #030a16 100%)" }}
    >
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#d4af37]/5 blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-blue-900/20 blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-[#d4af37]/8 blur-[80px]" />
        {/* Fine dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #d4af37 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* ── DHARMA CHAKRA + HEADER ── */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
          animate={mounted ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            <DharmaChakra size={110} />
          </motion.div>
        </motion.div>

        {/* Firm name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="text-center px-6"
        >
          {/* RN monogram */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <div className="text-5xl sm:text-6xl font-black tracking-tight leading-none"
                style={{ background: "linear-gradient(135deg, #f5d078 0%, #d4af37 40%, #b8860b 70%, #f5d078 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "serif", textShadow: "none", filter: "drop-shadow(0 2px 8px rgba(212,175,55,0.4))" }}>
                RN
              </div>
            </div>
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-[#d4af37]/40 to-transparent" />
            <div className="text-left">
              <div className="text-lg sm:text-2xl font-black tracking-wider leading-tight"
                style={{ background: "linear-gradient(135deg, #f5d078, #d4af37, #b8860b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "serif" }}>
                RISHIKA NAGPAL
              </div>
              <div className="text-lg sm:text-2xl font-black tracking-wider"
                style={{ background: "linear-gradient(135deg, #f5d078, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "serif" }}>
                & ASSOCIATES
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
            <p className="text-[#d4af37]/60 text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">Advocates & Consultants</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
          </div>
        </motion.div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-8">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 justify-center">

          {/* Left: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ transform: "rotate(-4deg)" }}
            className="flex-shrink-0"
          >
            <PhoneMockup />
          </motion.div>

          {/* Right: Portal cards + info */}
          <div className="flex flex-col items-center w-full max-w-lg">

            {/* Section label */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center mb-6"
            >
              <p className="text-[#d4af37]/60 text-xs tracking-[0.35em] uppercase font-semibold mb-2">Enter Your Portal</p>
              <div className="flex items-center gap-3 justify-center">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/60" />
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]/40" />
              </div>
            </motion.div>

            {/* Portal grid — 3 cards */}
            <div className="grid grid-cols-3 gap-4 w-full mb-8">
              <PortalCard href="/advocate" icon={Gavel} label="Advocate" subLabel="Portal" delay={0.6} />
              <PortalCard href="/client" icon={Scale} label="Client" subLabel="Portal" delay={0.75} />
              <PortalCard href="/intern" icon={BookOpen} label="Knowledge" subLabel="Base" delay={0.9} emoji="📚" />
            </div>

            {/* Dharma tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="text-center mb-6"
            >
              <div className="flex items-center gap-3 justify-center mb-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4af37]/30" />
                <Star className="w-3 h-3 text-[#d4af37]/50" fill="currentColor" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4af37]/30" />
              </div>
              <p className="text-[#d4af37]/50 text-xs tracking-[0.25em] uppercase font-medium">Dharmo Rakshati Rakshitah</p>
              <p className="text-[#d4af37]/30 text-[10px] mt-1 tracking-widest">धर्मो रक्षति रक्षितः</p>
            </motion.div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.6 }}
              className="flex flex-wrap gap-x-5 gap-y-2 justify-center"
            >
              {[
                { label: "Wellness Quiz", href: "/client/wellness" },
                { label: "Know Your Rights", href: "/client/rights" },
                { label: "Connect Advocate", href: "/client/connect" },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <button className="text-[#d4af37]/35 hover:text-[#d4af37]/70 text-[11px] tracking-wide transition-colors flex items-center gap-1 group">
                    {l.label} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </Link>
              ))}
            </motion.div>
          </div>

          {/* Peacock feather — hidden on smaller screens */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="hidden xl:flex flex-shrink-0 self-end pb-4"
          >
            <PeacockFeather />
          </motion.div>
        </div>
      </div>

      {/* ── FLOOR ── */}
      <FloorGrid />

      {/* ── BOTTOM ATTRIBUTION ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="relative z-10 text-center py-5 border-t border-[#d4af37]/10"
      >
        <p className="text-[#d4af37]/25 text-[10px] tracking-[0.3em] uppercase">
          Subhash Nagar, New Delhi &nbsp;·&nbsp; Est. 2018 &nbsp;·&nbsp; Delhi High Court &amp; Supreme Court
        </p>
      </motion.div>
    </div>
  );
}
