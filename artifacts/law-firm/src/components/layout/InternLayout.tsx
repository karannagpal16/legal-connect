import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Scale, Home, Target, Trophy, Library, BookMarked, Star, Menu, X, TrendingUp, MessageCircle, Sparkles, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "My Dashboard", href: "/intern", icon: Home },
  { name: "Active Quests", href: "/intern/quests", icon: Target },
  { name: "XP & Levels", href: "/intern/xp", icon: TrendingUp },
  { name: "Leaderboard", href: "/intern/leaderboard", icon: Trophy },
  { name: "Skill Badges", href: "/intern/badges", icon: Star },
  { name: "Case Tracker", href: "/intern/cases", icon: FileSearch },
  { name: "Doubt Portal", href: "/intern/doubts", icon: MessageCircle },
  { name: "AI Assistant", href: "/intern/ai-assistant", icon: Sparkles },
  { name: "Legal Library", href: "/intern/library", icon: Library },
];

const E = "#1A2332";
const G = "#D4A050";
const M = "#5A6A7A";
const T = "#1A2332";

export function InternLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "linear-gradient(180deg, #F7F2EC 0%, #EDE4D8 100%)" }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#1A2332]/20 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "linear-gradient(180deg, #F8F6F3 0%, #EDE8E0 100%)", borderRight: "1px solid rgba(30,41,55,0.1)" }}
      >
        <div className="flex items-center justify-between h-20 px-6" style={{ borderBottom: "1px solid rgba(30,41,55,0.1)", background: "rgba(30,41,55,0.02)" }}>
          <Link href="/intern" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(30,41,55,0.06)", border: "1px solid rgba(30,41,55,0.15)" }}>
              <BookMarked className="w-5 h-5" style={{ color: E }} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight tracking-wide" style={{ color: T }}>Intern Portal</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: G }}>Legal Connect</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2" style={{ color: M }}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          <div className="px-3 mb-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: G }}>Your Journey</div>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive ? "bg-[#1A2332]/10" : "hover:bg-[#1A2332]/4"
                )}
                style={isActive ? { color: E, border: "1px solid rgba(30,41,55,0.15)" } : { color: M }}
              >
                {isActive && <motion.div layoutId="internActiveTab" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: E }} />}
                <item.icon className={cn("w-5 h-5", isActive ? "" : "opacity-50 group-hover:opacity-70")} style={isActive ? { color: E } : {}} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6" style={{ borderTop: "1px solid rgba(30,41,55,0.1)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(30,41,55,0.04)", border: "1px solid rgba(30,41,55,0.08)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "rgba(30,41,55,0.08)", color: E }}>
              L3
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold" style={{ color: T }}>Intern User</span>
              <span className="text-xs" style={{ color: G }}>Legal Apprentice · Lvl 3</span>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-center text-xs transition-colors" style={{ color: G }}>
            ← Back to Home
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md md:hidden sticky top-0 z-30" style={{ borderBottom: "1px solid rgba(30,41,55,0.1)" }}>
          <div className="flex items-center gap-2">
            <BookMarked className="w-6 h-6" style={{ color: E }} />
            <span className="font-serif font-bold text-lg" style={{ color: T }}>Intern Portal</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2" style={{ color: M }}>
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
