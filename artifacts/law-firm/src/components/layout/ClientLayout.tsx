import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Scale, Home, Phone, Bell, Library, Menu, X, User, Sparkles, FileText, BookOpen, Pen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Home", href: "/client", icon: Home },
  { name: "Book an Advocate", href: "/client/book", icon: Phone },
  { name: "Case Reminders", href: "/client/reminders", icon: Bell },
  { name: "Law Made Simple", href: "/client/legal-guide", icon: BookOpen },
  { name: "DIY Documents", href: "/client/diy-docs", icon: Pen },
  { name: "AI Assistant", href: "/client/ai-assistant", icon: Sparkles },
  { name: "Legal Library", href: "/client/library", icon: Library },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
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
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-blue-500/20 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-blue-500/20 bg-blue-500/5">
          <Link href="/client" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Scale className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight text-white tracking-wide">Client Portal</span>
              <span className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">RNA Legal Connect</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          <div className="px-3 mb-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Client Menu</div>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                  isActive
                    ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div layoutId="clientActiveTab" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/60")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-blue-500/20">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Client</span>
              <span className="text-xs text-blue-400">client@rna.law</span>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-center text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b border-blue-500/20 bg-background/80 backdrop-blur-md md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-400" />
            <span className="font-serif font-bold text-lg text-white">Client Portal</span>
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
