import { Link } from "wouter";
import { Target, Trophy, TrendingUp, Star, Library, Zap, BookMarked, ArrowRight, MessageCircle, Sparkles, Flame, Award, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useListInternQuests } from "@workspace/api-client-react";

const levels = [
  { level: 1, title: "Legal Rookie", xpRequired: 0, color: "text-[#1A2332]/60", accent: "#ffffff60", bg: "bg-[#1A2332]/10" },
  { level: 2, title: "Junior Clerk", xpRequired: 100, color: "text-emerald-400", accent: "#34d399", bg: "bg-emerald-500/20" },
  { level: 3, title: "Legal Apprentice", xpRequired: 250, color: "text-blue-400", accent: "#60a5fa", bg: "bg-blue-500/20" },
  { level: 4, title: "Associate Trainee", xpRequired: 500, color: "text-violet-400", accent: "#a78bfa", bg: "bg-violet-500/20" },
  { level: 5, title: "Advocate Candidate", xpRequired: 1000, color: "text-amber-400", accent: "#fbbf24", bg: "bg-amber-500/20" },
];

const dailyChallenges = [
  { icon: BookMarked, title: "Read one landmark judgment", xp: 25, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Sparkles, title: "Draft a bail application", xp: 40, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { icon: MessageCircle, title: "Answer a doubt in the portal", xp: 30, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
];

const leaderboardPeek = [
  { name: "Arjun S.", xp: 840, rank: 1, badge: "🥇" },
  { name: "Neha P.", xp: 720, rank: 2, badge: "🥈" },
  { name: "You", xp: 0, rank: "–", badge: "🎯", isYou: true },
];

const navFeatures = [
  { icon: Target, title: "Active Quests", desc: "Earn XP by completing tasks", href: "/intern/quests", color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/30" },
  { icon: TrendingUp, title: "XP & Levels", desc: "Track your legal career growth", href: "/intern/xp", color: "text-blue-400", gradient: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/30" },
  { icon: Trophy, title: "Leaderboard", desc: "Compete with other interns", href: "/intern/leaderboard", color: "text-amber-400", gradient: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/30" },
  { icon: Star, title: "Skill Badges", desc: "Get certified in practice areas", href: "/intern/badges", color: "text-rose-400", gradient: "from-rose-500/20 to-rose-600/5", border: "border-rose-500/30" },
  { icon: MessageCircle, title: "Doubt Portal", desc: "Ask seniors, get real answers", href: "/intern/doubts", color: "text-cyan-400", gradient: "from-cyan-500/20 to-cyan-600/5", border: "border-cyan-500/30" },
  { icon: Sparkles, title: "AI Assistant", desc: "Draft, learn, and get help 24/7", href: "/intern/ai-assistant", color: "text-violet-400", gradient: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/30" },
];

export function InternDashboard() {
  const { data: quests = [] } = useListInternQuests();

  const completedXP = quests.filter(q => q.status === "Completed").reduce((sum, q) => sum + q.xpPoints, 0);
  const openQuests = quests.filter(q => q.status === "Open").length;
  const completedQuests = quests.filter(q => q.status === "Completed").length;

  const currentLevel = levels.slice().reverse().find(l => completedXP >= l.xpRequired) || levels[0];
  const nextLevel = levels.find(l => l.xpRequired > completedXP);
  const progressToNext = nextLevel
    ? ((completedXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;

  const xpToNext = nextLevel ? nextLevel.xpRequired - completedXP : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-emerald-400 text-sm font-semibold mb-1 flex items-center gap-2">
          <Flame className="w-4 h-4" /> Welcome back, Intern
        </p>
        <h1 className="text-3xl font-serif font-bold text-[#1A2332]">Your Legal Journey</h1>
        <p className="text-[#1A2332]/40 mt-1">Keep grinding. Every quest brings you closer to the courtroom.</p>
      </motion.div>

      {/* Level Card — Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-transparent border border-emerald-500/35 rounded-3xl p-7"
      >
        {/* BG glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-start gap-5 mb-6">
            {/* Level badge */}
            <div className="relative flex-shrink-0">
              <div className={`w-20 h-20 rounded-2xl ${currentLevel.bg} border border-white/15 flex flex-col items-center justify-center shadow-2xl`}
                style={{ boxShadow: `0 0 30px ${currentLevel.accent}30` }}>
                <span className="text-[10px] text-[#1A2332]/40 font-bold uppercase tracking-wider">LVL</span>
                <span className={`text-3xl font-bold ${currentLevel.color}`}>{currentLevel.level}</span>
              </div>
              {completedXP > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <Zap className="w-3.5 h-3.5 text-[#1A2332] fill-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <h2 className={`text-xl font-bold ${currentLevel.color}`}>{currentLevel.title}</h2>
                <div className={`flex items-center gap-1.5 ${currentLevel.color}`}>
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="font-bold text-lg">{completedXP} XP</span>
                </div>
              </div>
              <p className="text-[#1A2332]/40 text-xs mb-3">
                {nextLevel ? `${xpToNext} XP to unlock ` : ""}
                {nextLevel ? <span className={`${nextLevel.color} font-semibold`}>{nextLevel.title}</span> : <span className="text-amber-400 font-semibold">Max Level!</span>}
              </p>

              {/* Progress bar */}
              <div className="relative w-full bg-[#1A2332]/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full relative"
                  style={{ background: `linear-gradient(90deg, ${currentLevel.accent}80, ${currentLevel.accent})` }}
                >
                  <div className="absolute inset-0 bg-[#1A2332]/30 blur-sm" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-[#1A2332]/30">
                <span>Lv {currentLevel.level}</span>
                <span>{Math.round(progressToNext)}%</span>
                {nextLevel && <span>Lv {nextLevel.level}</span>}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total XP", value: completedXP, icon: Zap, color: "text-emerald-400" },
              { label: "Open Quests", value: openQuests, icon: Target, color: "text-blue-400" },
              { label: "Completed", value: completedQuests, icon: Award, color: "text-amber-400" },
            ].map((s, i) => (
              <div key={s.label} className="bg-[#1A2332]/5 rounded-xl px-3 py-3 text-center border border-[#1A2332]/8">
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1.5`} />
                <div className="text-[#1A2332] font-bold text-xl">{s.value}</div>
                <div className="text-[#1A2332]/30 text-[10px] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Daily Challenges */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1A2332]/30 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-orange-400" /> Daily Challenges
          </h2>
          <span className="text-[10px] text-[#1A2332]/30 bg-[#1A2332]/5 px-2 py-1 rounded-full border border-[#1A2332]/10">Resets daily</span>
        </div>
        <div className="space-y-2.5">
          {dailyChallenges.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + 0.07 * i }}
              className={`flex items-center gap-4 border rounded-2xl px-5 py-4 cursor-pointer hover:-translate-x-0 hover:brightness-110 transition-all group ${c.bg}`}
            >
              <c.icon className={`w-5 h-5 ${c.color} flex-shrink-0`} />
              <span className="text-[#1A2332] text-sm font-medium flex-1">{c.title}</span>
              <div className={`flex items-center gap-1 ${c.color} text-xs font-bold`}>
                <Zap className="w-3 h-3 fill-current" /> +{c.xp} XP
              </div>
              <ChevronRight className="w-4 h-4 text-[#1A2332]/20 group-hover:text-[#1A2332]/50 transition-colors" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick leaderboard peek */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1A2332]/30 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Leaderboard Preview
          </h2>
          <Link href="/intern/leaderboard">
            <span className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1 transition-colors">
              Full board <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        <div className="space-y-2">
          {leaderboardPeek.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 border transition-all ${
                p.isYou
                  ? "bg-emerald-500/10 border-emerald-500/25"
                  : "bg-card/30 border-[#1A2332]/8"
              }`}
            >
              <span className="text-xl w-8 text-center">{p.badge}</span>
              <div className="flex-1">
                <span className={`text-sm font-bold ${p.isYou ? "text-emerald-400" : "text-[#1A2332]"}`}>{p.name}</span>
                {p.isYou && <span className="ml-2 text-[10px] text-emerald-400/60">← you</span>}
              </div>
              <span className={`text-sm font-bold flex items-center gap-1 ${p.isYou ? "text-emerald-400/60" : "text-amber-400"}`}>
                <Zap className="w-3 h-3 fill-current" /> {p.isYou ? `${completedXP} XP` : `${p.xp} XP`}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1A2332]/30 mb-4">All Features</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {navFeatures.map((f, i) => (
            <Link key={f.title} href={f.href}>
              <motion.div
                whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                className={`group relative overflow-hidden bg-gradient-to-br ${f.gradient} border ${f.border} rounded-2xl p-4 cursor-pointer transition-all`}
              >
                <f.icon className={`w-6 h-6 mb-2.5 ${f.color}`} />
                <p className="text-[#1A2332] text-xs font-bold mb-0.5">{f.title}</p>
                <p className="text-[#1A2332]/35 text-[11px] leading-relaxed">{f.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
