import { Star, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useListInternQuests } from "@workspace/api-client-react";

const allBadges = [
  { id: 1, emoji: "⚖️", title: "First Brief", desc: "Drafted your first legal brief", xpRequired: 0, earnedAt: "Mar 15, 2026", earned: true },
  { id: 2, emoji: "📚", title: "Bookworm", desc: "Accessed the Legal Library 5 times", xpRequired: 50, earnedAt: "Mar 20, 2026", earned: true },
  { id: 3, emoji: "🎯", title: "Quest Hunter", desc: "Completed 5 quests", xpRequired: 100, earnedAt: "Mar 25, 2026", earned: true },
  { id: 4, emoji: "🔍", title: "Case Researcher", desc: "Completed 3 research quests", xpRequired: 150, earnedAt: null, earned: false },
  { id: 5, emoji: "🏛️", title: "Court Observer", desc: "Attended a hearing in person", xpRequired: 200, earnedAt: null, earned: false },
  { id: 6, emoji: "🤝", title: "Team Player", desc: "Collaborated on 3 proxy tasks", xpRequired: 250, earnedAt: null, earned: false },
  { id: 7, emoji: "📝", title: "Brief Master", desc: "Drafted 10 legal documents", xpRequired: 400, earnedAt: null, earned: false },
  { id: 8, emoji: "🌟", title: "Rising Star", desc: "Reached Level 4 Advocate Trainee", xpRequired: 500, earnedAt: null, earned: false },
  { id: 9, emoji: "👑", title: "Legal Scholar", desc: "Completed all level 5 quests", xpRequired: 1000, earnedAt: null, earned: false },
];

export function InternBadges() {
  const { data: quests = [] } = useListInternQuests();
  const myXP = quests.filter(q => q.status === "Completed").reduce((sum, q) => sum + q.xpPoints, 0);

  const earned = allBadges.filter(b => b.earned || myXP >= b.xpRequired);
  const locked = allBadges.filter(b => !b.earned && myXP < b.xpRequired);

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
          <h1 className="text-3xl font-serif font-bold text-[#1A2E2A]">Skill Badges</h1>
        </div>
        <p className="text-[#1A2E2A]/40 ml-10">Earn badges by completing achievements and leveling up.</p>
      </div>

      {/* Earned badges */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2E2A]/40 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Earned Badges ({earned.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {earned.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.06 * i }}
              className="bg-gradient-to-b from-amber-500/15 to-transparent border border-amber-500/25 rounded-2xl p-5 flex flex-col items-center text-center group hover:border-amber-500/50 transition-all"
            >
              <div className="text-4xl mb-3">{badge.emoji}</div>
              <h3 className="text-[#1A2E2A] font-bold text-sm mb-1">{badge.title}</h3>
              <p className="text-[#1A2E2A]/40 text-xs leading-relaxed mb-3">{badge.desc}</p>
              {badge.earnedAt && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Earned {badge.earnedAt}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A2E2A]/30 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#1A2E2A]/30" />
            Locked Badges ({locked.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {locked.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.06 * i + 0.2 }}
                className="bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 rounded-2xl p-5 flex flex-col items-center text-center opacity-50"
              >
                <div className="text-4xl mb-3 grayscale">{badge.emoji}</div>
                <div className="w-5 h-5 rounded-full bg-[#1A2E2A]/10 flex items-center justify-center mb-2">
                  <Lock className="w-3 h-3 text-[#1A2E2A]/30" />
                </div>
                <h3 className="text-[#1A2E2A]/50 font-bold text-sm mb-1">{badge.title}</h3>
                <p className="text-[#1A2E2A]/20 text-xs leading-relaxed mb-3">{badge.desc}</p>
                <span className="text-[10px] text-[#1A2E2A]/30 bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 px-2 py-0.5 rounded-full">
                  Requires {badge.xpRequired} XP
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
