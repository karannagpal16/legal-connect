import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Scale, Home, BookOpen, Briefcase, Library, Bell,
  BarChart3, Users, Menu, X, Gavel, Video, CalendarCheck, MessageSquare, Landmark, FileSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/advocate", icon: Home },
  { name: "My Diary", href: "/advocate/diary", icon: BookOpen },
  { name: "Client Calls", href: "/advocate/calls", icon: Video },
  { name: "Client Messages", href: "/advocate/chat", icon: MessageSquare },
  { name: "Proxy Hub", href: "/advocate/proxy", icon: Briefcase },
  { name: "Judges Roster", href: "/advocate/judges", icon: Landmark },
  { name: "Case Tracker", href: "/advocate/cases", icon: FileSearch },
  { name: "Case Reminders", href: "/advocate/reminders", icon: Bell },
  { name: "Bookings", href: "/advocate/bookings", icon: CalendarCheck },
  { name: "Legal Library", href: "/advocate/library", icon: Library },
  { name: "Revenue", href: "/advocate/revenue", icon: BarChart3 },
  { name: "Team", href: "/advocate/team", icon: Users },
];

export function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "linear-gradient(180deg, #FFF8F0 0%, #FFEDD5 100%)" }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#4a1a1a]/30 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "linear-gradient(180deg, #FFF8F0 0%, #FFEDD5 100%)", borderRight: "1px solid rgba(210,105,30,0.12)" }}
      >
        <div className="flex items-center justify-between h-20 px-6" style={{ borderBottom: "1px solid rgba(210,105,30,0.12)", background: "rgba(210,105,30,0.03)" }}>
          <Link href="/advocate" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(210,105,30,0.08)", border: "1px solid rgba(210,105,30,0.2)" }}>
              <Gavel className="w-5 h-5 text-[#D2691E]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight text-[#4a1a1a] tracking-wide">Advocate Portal</span>
              <span className="text-[10px] uppercase tracking-widest text-[#D2691E]/70 font-semibold">Legal Connect</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#8B5A2B]/60 hover:text-[#4a1a1a] p-2">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-bold text-[#D2691E]/25 uppercase tracking-widest">Practice Management</div>
          {navigation.slice(0, 7).map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive ? "text-[#D2691E] bg-[#D2691E]/10" : "text-[#8B5A2B]/60 hover:text-[#4a1a1a] hover:bg-[#D2691E]/5"
                )}
                style={isActive ? { border: "1px solid rgba(210,105,30,0.2)" } : {}}
              >
                {isActive && <motion.div layoutId="advocateActiveTab" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: "#D2691E" }} />}
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#D2691E]" : "text-[#8B5A2B]/40 group-hover:text-[#8B5A2B]/60")} />
                {item.name}
              </Link>
            );
          })}

          <div className="px-3 mt-6 mb-2 text-[10px] font-bold text-[#D2691E]/25 uppercase tracking-widest">Administration</div>
          {navigation.slice(7).map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive ? "text-[#D2691E] bg-[#D2691E]/10" : "text-[#8B5A2B]/60 hover:text-[#4a1a1a] hover:bg-[#D2691E]/5"
                )}
                style={isActive ? { border: "1px solid rgba(210,105,30,0.2)" } : {}}
              >
                {isActive && <motion.div layoutId="advocateActiveTab" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: "#D2691E" }} />}
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#D2691E]" : "text-[#8B5A2B]/40 group-hover:text-[#8B5A2B]/60")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6" style={{ borderTop: "1px solid rgba(210,105,30,0.12)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(210,105,30,0.05)", border: "1px solid rgba(210,105,30,0.12)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(210,105,30,0.1)" }}>
              <Gavel className="w-4 h-4 text-[#D2691E]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#4a1a1a]">Rishika Nagpal</span>
              <span className="text-xs text-[#D2691E]/60">Senior Advocate</span>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-center text-xs text-[#D2691E]/25 hover:text-[#D2691E]/50 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md md:hidden sticky top-0 z-30" style={{ borderBottom: "1px solid rgba(210,105,30,0.12)" }}>
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-[#D2691E]" />
            <span className="font-serif font-bold text-lg text-[#4a1a1a]">Advocate Portal</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-[#8B5A2B]/60 hover:text-[#4a1a1a]">
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
