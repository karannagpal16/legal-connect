import { Zap, TrendingUp, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useListInternQuests } from "@workspace/api-client-react";

const levels = [
  { level: 1, title: "Legal Rookie", xpRequired: 0, color: "text-[#1A2332]/50", ring: "border-[#1A2332]/20", desc: "Starting out in the legal world." },
  { level: 2, title: "Junior Clerk", xpRequired: 100, color: "text-emerald-400", ring: "border-emerald-500/40", desc: "Getting familiar with legal procedures." },
  { level: 3, title: "Legal Apprentice", xpRequired: 250, color: "text-blue-400", ring: "border-blue-500/40", desc: "Actively working on case research." },
  { level: 4, title: "Associate Trainee", xpRequired: 500, color: "text-violet-400", ring: "border-violet-500/40", desc: "Handling briefs and drafts independently." },
  { level: 5, title: "Advocate Candidate", xpRequired: 1000, color: "text-amber-400", ring: "border-amber-500/40", desc: "Ready for bar enrollment and full practice." },
];

const xpActivities = [
  { action: "Complete a Quest", xp: "+25–100 XP", icon: "🎯" },
  { action: "Draft a Legal Brief", xp: "+50 XP", icon: "📄" },
  { action: "Attend Court Hearing", xp: "+75 XP", icon: "⚖️" },
  { action: "Pass a Case Quiz", xp: "+30 XP", icon: "📚" },
  { action: "Mentor Junior Intern", xp: "+40 XP", icon: "🤝" },
];

export function InternXP() {
  const { data: quests = [] } = useListInternQuests();
  const completedXP = quests.filter(q => q.status === "Completed").reduce((sum, q) => sum + q.xpPoints, 0);
  const completedQuests = quests.filter(q => q.status === "Completed");

  const currentLevel = levels.slice().reverse().find(l => completedXP >= l.xpRequired) || levels[0];
  const nextLevel = levels.find(l => l.xpRequired > completedXP);
  const progressToNext = nextLevel
    ? ((completedXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-7 h-7 text-emerald-400" />
          <h1 className="text-3xl font-serif font-bold text-[#1A2332]">XP & Levels</h1>
        </div>
        <p className="text-[#1A2332]/40 ml-10">Track your growth and unlock new levels.</p>
      </div>

      {/* Current XP bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500/15 to-transparent border border-emerald-500/25 rounded-3xl p-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#1A2332]/40 font-semibold">Current Level</span>
            <h2 className={`text-2xl font-bold mt-1 ${currentLevel.color}`}>
              Lvl {currentLevel.level} · {currentLevel.title}
            </h2>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-emerald-400">
              <Zap className="w-5 h-5 fill-emerald-400" />
              <span className="text-3xl font-bold">{completedXP}</span>
            </div>
            <span className="text-xs text-[#1A2332]/30">Total XP Earned</span>
          </div>
        </div>

        {nextLevel && (
          <>
            <div className="relative w-full bg-[#1A2332]/10 rounded-full h-3 mb-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                className="h-3 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#1A2332]/40">
              <span>{currentLevel.xpRequired} XP</span>
              <span className={nextLevel.color}>{nextLevel.xpRequired} XP — {nextLevel.title}</span>
            </div>
          </>
        )}
      </motion.div>

      {/* Level roadmap */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2332]/40 mb-5">Level Roadmap</h2>
        <div className="space-y-3">
          {levels.map((lvl, i) => {
            const unlocked = completedXP >= lvl.xpRequired;
            const isCurrent = lvl.level === currentLevel.level;
            return (
              <motion.div
                key={lvl.level}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
                className={`flex items-center gap-5 p-5 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : unlocked
                    ? "bg-[#1A2332]/5 border-[#1A2332]/10"
                    : "bg-transparent border-white/5 opacity-50"
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center flex-shrink-0 ${lvl.ring} ${unlocked ? "" : "border-[#1A2332]/10"}`}>
                  {unlocked ? (
                    <>
                      <span className="text-[10px] text-[#1A2332]/40">LVL</span>
                      <span className={`text-xl font-bold ${lvl.color}`}>{lvl.level}</span>
                    </>
                  ) : (
                    <Lock className="w-5 h-5 text-[#1A2332]/20" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${unlocked ? lvl.color : "text-[#1A2332]/30"}`}>{lvl.title}</h3>
                    {isCurrent && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Current</span>}
                    {unlocked && !isCurrent && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className={`text-xs mt-0.5 ${unlocked ? "text-[#1A2332]/40" : "text-[#1A2332]/20"}`}>{lvl.desc}</p>
                </div>
                <div className={`text-right ${unlocked ? "" : "opacity-40"}`}>
                  <div className={`text-sm font-bold ${lvl.color}`}>{lvl.xpRequired} XP</div>
                  <div className="text-xs text-[#1A2332]/30">required</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How to earn XP */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2332]/40 mb-4">How to Earn XP</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {xpActivities.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * i + 0.4 }}
              className="flex items-center gap-4 bg-[#1A2332]/5 border border-[#1A2332]/10 rounded-2xl p-4"
            >
              <span className="text-2xl">{a.icon}</span>
              <div className="flex-1">
                <p className="text-[#1A2332] text-sm font-semibold">{a.action}</p>
              </div>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{a.xp}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Completed quests log */}
      {completedQuests.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2332]/40 mb-4">Completed Quests</h2>
          <div className="space-y-2">
            {completedQuests.map((q, i) => (
              <div key={q.id} className="flex items-center gap-4 bg-[#1A2332]/5 border border-white/5 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-[#1A2332] text-sm flex-1">{q.title}</span>
                <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                  <Zap className="w-3.5 h-3.5" />
                  +{q.xpPoints} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
