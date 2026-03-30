import { Link } from "wouter";
import { Target, Trophy, TrendingUp, Star, Library, Zap, BookMarked, ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useListInternQuests } from "@workspace/api-client-react";

const levels = [
  { level: 1, title: "Legal Rookie", xpRequired: 0, color: "text-white/40", bg: "bg-white/10" },
  { level: 2, title: "Junior Clerk", xpRequired: 100, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  { level: 3, title: "Legal Apprentice", xpRequired: 250, color: "text-blue-400", bg: "bg-blue-500/20" },
  { level: 4, title: "Associate Trainee", xpRequired: 500, color: "text-violet-400", bg: "bg-violet-500/20" },
  { level: 5, title: "Advocate Candidate", xpRequired: 1000, color: "text-amber-400", bg: "bg-amber-500/20" },
];

const features = [
  { icon: Target, title: "Active Quests", desc: "Complete tasks to earn XP", href: "/intern/quests", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { icon: TrendingUp, title: "XP & Levels", desc: "Track your progression", href: "/intern/xp", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Trophy, title: "Leaderboard", desc: "See how you rank", href: "/intern/leaderboard", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { icon: Star, title: "Skill Badges", desc: "Earn recognition for expertise", href: "/intern/badges", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
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

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BookMarked className="w-7 h-7 text-emerald-400" />
          <h1 className="text-3xl font-serif font-bold text-white">Intern Dashboard</h1>
        </div>
        <p className="text-white/40 ml-10">Your legal journey starts here. Keep leveling up!</p>
      </motion.div>

      {/* Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-3xl p-7"
      >
        <div className="flex items-center gap-5">
          <div className={`w-20 h-20 rounded-3xl ${currentLevel.bg} flex flex-col items-center justify-center border border-white/10 flex-shrink-0`}>
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">LVL</span>
            <span className={`text-3xl font-bold ${currentLevel.color}`}>{currentLevel.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-xl font-bold ${currentLevel.color}`}>{currentLevel.title}</h2>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
                <span className="font-bold text-lg">{completedXP} XP</span>
              </div>
            </div>
            {nextLevel ? (
              <>
                <div className="w-full bg-white/10 rounded-full h-2 mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className="h-2 bg-emerald-400 rounded-full"
                  />
                </div>
                <p className="text-white/40 text-xs">
                  {nextLevel.xpRequired - completedXP} XP to <span className={nextLevel.color}>{nextLevel.title}</span>
                </p>
              </>
            ) : (
              <p className="text-amber-400 text-sm font-semibold">Maximum Level Reached!</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total XP", value: completedXP, icon: Zap, color: "text-emerald-400" },
          { label: "Open Quests", value: openQuests, icon: Target, color: "text-blue-400" },
          { label: "Completed", value: completedQuests, icon: Trophy, color: "text-amber-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i + 0.2 }}
            className="bg-card/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center"
          >
            <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
            <span className="text-3xl font-bold text-white mb-1">{stat.value}</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Your Learning Hub</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              <Link href={f.href}>
                <div className={`group border rounded-2xl p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${f.bg}`}>
                  <f.icon className={`w-8 h-8 mb-3 ${f.color}`} />
                  <h3 className="text-lg font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-white/40 text-sm">{f.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
