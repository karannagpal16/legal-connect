import { Trophy, Zap, Medal, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useListInternQuests } from "@workspace/api-client-react";

const leaderboard = [
  { rank: 1, name: "Aanya Singh", initials: "AS", level: 4, xp: 620, color: "bg-amber-500", badge: "Associate Trainee", quests: 18 },
  { rank: 2, name: "Rohan Kapoor", initials: "RK", level: 3, xp: 410, color: "bg-blue-500", badge: "Legal Apprentice", quests: 13 },
  { rank: 3, name: "Intern User", initials: "ME", level: 3, xp: 310, color: "bg-emerald-500", badge: "Legal Apprentice", quests: 10, isMe: true },
  { rank: 4, name: "Deepa Nair", initials: "DN", level: 2, xp: 210, color: "bg-violet-500", badge: "Junior Clerk", quests: 8 },
  { rank: 5, name: "Karan Mehta", initials: "KM", level: 2, xp: 180, color: "bg-rose-500", badge: "Junior Clerk", quests: 6 },
  { rank: 6, name: "Priya Bose", initials: "PB", level: 1, xp: 90, color: "bg-slate-500", badge: "Legal Rookie", quests: 4 },
];

const rankIcons: Record<number, { icon: typeof Trophy; color: string }> = {
  1: { icon: Crown, color: "text-amber-400" },
  2: { icon: Medal, color: "text-slate-300" },
  3: { icon: Medal, color: "text-amber-600" },
};

export function InternLeaderboard() {
  const { data: quests = [] } = useListInternQuests();
  const myXP = quests.filter(q => q.status === "Completed").reduce((sum, q) => sum + q.xpPoints, 0);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-7 h-7 text-amber-400" />
          <h1 className="text-3xl font-serif font-bold text-white">Leaderboard</h1>
        </div>
        <p className="text-white/40 ml-10">Compete, grow, and rise through the ranks.</p>
      </div>

      {/* Top 3 podium */}
      <div className="flex items-end justify-center gap-4 py-4">
        {/* 2nd */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div className={`w-16 h-16 rounded-2xl ${top3[1].color} flex items-center justify-center text-white font-bold text-xl mb-2 shadow-xl`}>
            {top3[1].initials}
          </div>
          <p className="text-white text-xs font-bold text-center">{top3[1].name}</p>
          <div className="flex items-center gap-1 text-slate-300 text-xs mt-1">
            <Medal className="w-3.5 h-3.5" />
            <span>{top3[1].xp} XP</span>
          </div>
          <div className="w-20 h-20 bg-slate-500/20 border border-slate-500/30 rounded-t-xl mt-3 flex items-center justify-center">
            <span className="text-slate-300 font-bold text-2xl">2</span>
          </div>
        </motion.div>

        {/* 1st */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <Crown className="w-6 h-6 text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2" />
            <div className={`w-20 h-20 rounded-2xl ${top3[0].color} flex items-center justify-center text-white font-bold text-2xl mb-2 shadow-2xl border-2 border-amber-400/50`}>
              {top3[0].initials}
            </div>
          </div>
          <p className="text-white text-sm font-bold text-center">{top3[0].name}</p>
          <div className="flex items-center gap-1 text-amber-400 text-sm mt-1 font-bold">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>{top3[0].xp} XP</span>
          </div>
          <div className="w-20 h-28 bg-amber-500/20 border border-amber-500/30 rounded-t-xl mt-3 flex items-center justify-center">
            <span className="text-amber-400 font-bold text-2xl">1</span>
          </div>
        </motion.div>

        {/* 3rd */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center"
        >
          <div className={`w-14 h-14 rounded-2xl ${top3[2].color} flex items-center justify-center text-white font-bold text-lg mb-2 shadow-xl ${top3[2].isMe ? "ring-2 ring-emerald-400" : ""}`}>
            {top3[2].initials}
          </div>
          <p className="text-white text-xs font-bold text-center">{top3[2].name}{top3[2].isMe && " (You)"}</p>
          <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
            <Medal className="w-3.5 h-3.5" />
            <span>{top3[2].xp} XP</span>
          </div>
          <div className="w-20 h-12 bg-amber-700/20 border border-amber-700/30 rounded-t-xl mt-3 flex items-center justify-center">
            <span className="text-amber-700 font-bold text-2xl">3</span>
          </div>
        </motion.div>
      </div>

      {/* Full list */}
      <div className="space-y-3">
        {leaderboard.map((entry, i) => {
          const RankIcon = rankIcons[entry.rank];
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * i }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                entry.isMe
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-card/30 border-white/10"
              }`}
            >
              <div className="w-8 text-center">
                {RankIcon ? (
                  <RankIcon.icon className={`w-5 h-5 ${RankIcon.color} mx-auto`} />
                ) : (
                  <span className="text-white/30 font-bold text-sm">{entry.rank}</span>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl ${entry.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {entry.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{entry.name}</span>
                  {entry.isMe && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">YOU</span>}
                </div>
                <span className="text-white/30 text-xs">{entry.badge} · {entry.quests} quests</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm justify-end">
                  <Zap className="w-3.5 h-3.5" />
                  {entry.isMe ? (myXP || entry.xp) : entry.xp}
                </div>
                <span className="text-white/20 text-xs">XP</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
