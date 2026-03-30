import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Scale, Home, BookOpen, Briefcase, Library, Bell,
  BarChart3, Users, Menu, X, Gavel, Video, CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/advocate", icon: Home },
  { name: "My Diary", href: "/advocate/diary", icon: BookOpen },
  { name: "Client Calls", href: "/advocate/calls", icon: Video },
  { name: "Proxy Hub", href: "/advocate/proxy", icon: Briefcase },
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-amber-500/20 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-amber-500/20 bg-amber-500/5">
          <Link href="/advocate" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Gavel className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight text-white tracking-wide">Advocate Portal</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">RNA Legal Connect</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Practice Management</div>
          {navigation.slice(0, 5).map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div layoutId="advocateActiveTab" className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-white/40 group-hover:text-white/60")} />
                {item.name}
              </Link>
            );
          })}

          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Administration</div>
          {navigation.slice(5).map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div layoutId="advocateActiveTab" className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-white/40 group-hover:text-white/60")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-amber-500/20">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Rishika Nagpal</span>
              <span className="text-xs text-amber-400">Senior Advocate</span>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-center text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b border-amber-500/20 bg-background/80 backdrop-blur-md md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-400" />
            <span className="font-serif font-bold text-lg text-white">Advocate Portal</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-white/60 hover:text-white">
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
