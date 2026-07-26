import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Scale, Home, Phone, Bell, Library, Menu, X, User, Sparkles, BookOpen, Pen, MessageSquare, Zap, Star, Newspaper, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SOSButton } from "@/components/SOSButton";

const navigation = [
  { name: "Home", href: "/client", icon: Home, section: null },
  { name: "Connect with Advocate", href: "/client/connect", icon: Zap, section: "Legal Help" },
  { name: "Book an Advocate", href: "/client/book", icon: Phone, section: "Legal Help" },
  { name: "My Advocate Chat", href: "/client/chat", icon: MessageSquare, section: "Legal Help" },
  { name: "My Cases", href: "/client/cases", icon: BarChart2, section: "Legal Help" },
  { name: "Legal Health Quiz", href: "/client/wellness", icon: Star, section: "Daily Tools" },
  { name: "Know Your Rights", href: "/client/rights", icon: Newspaper, section: "Daily Tools" },
  { name: "Case Reminders", href: "/client/reminders", icon: Bell, section: "Daily Tools" },
  { name: "Law Made Simple", href: "/client/legal-guide", icon: BookOpen, section: "Resources" },
  { name: "DIY Documents", href: "/client/diy-docs", icon: Pen, section: "Resources" },
  { name: "LawBot / Legal AI", href: "/client/lawbot", icon: Sparkles, section: "Resources" },
  { name: "AI Assistant", href: "/client/ai-assistant", icon: Sparkles, section: "Resources" },
  { name: "Legal Library", href: "/client/library", icon: Library, section: "Resources" },
];

const E = "#E2C27B";
const EL = "#7FB69B";
const G = "#CDA45E";
const M = "#C9BEA8";
const T = "#F3EAD7";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row lc-dashboard-shell">
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
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col lc-sidebar-panel",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6" style={{ borderBottom: "1px solid rgba(205,164,94,0.22)", background: "rgba(255,255,255,0.03)" }}>
          <Link href="/client" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(205,164,94,0.12)", border: "1px solid rgba(205,164,94,0.35)" }}>
              <Scale className="w-5 h-5" style={{ color: E }} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight tracking-wide" style={{ color: T }}>Client Portal</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: G }}>Legal Connect</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2" style={{ color: M }}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          {(() => {
            const sections = ["Legal Help", "Daily Tools", "Resources"];
            const homeItem = navigation.find(n => !n.section);
            return (
              <>
                {homeItem && (
                  <Link key={homeItem.name} href={homeItem.href} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group relative mb-2", location === homeItem.href ? "bg-[#CDA45E]/15" : "hover:bg-white/5")} style={location === homeItem.href ? { color: T, border: "1px solid rgba(205,164,94,0.32)" } : { color: M }}>
                    {location === homeItem.href && <motion.div layoutId="clientActiveTab" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: G }} />}
                    <homeItem.icon className={cn("w-5 h-5", location === homeItem.href ? "" : "opacity-50 group-hover:opacity-70")} style={location === homeItem.href ? { color: E } : {}} />
                    {homeItem.name}
                  </Link>
                )}
                {sections.map(section => {
                  const items = navigation.filter(n => n.section === section);
                  return (
                    <div key={section} className="mb-4">
                      <div className="px-3 mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: G }}>{section}</div>
                      {items.map(item => {
                        const isActive = location === item.href;
                        return (
                          <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group relative", isActive ? "bg-[#CDA45E]/15" : "hover:bg-white/5")} style={isActive ? { color: T, border: "1px solid rgba(205,164,94,0.32)" } : { color: M }}>
                            {isActive && <motion.div layoutId="clientActiveTab" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: G }} />}
                            <item.icon className={cn("w-4 h-4", isActive ? "" : "opacity-50 group-hover:opacity-70")} style={isActive ? { color: E } : {}} />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </nav>

        <div className="p-6" style={{ borderTop: "1px solid rgba(205,164,94,0.22)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl lc-sidebar-card">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(205,164,94,0.14)" }}>
              <User className="w-4 h-4" style={{ color: E }} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold" style={{ color: T }}>Client</span>
              <span className="text-xs" style={{ color: G }}>client@legalconnect.law</span>
            </div>
          </div>
          <Link href="/" className="mt-3 block text-center text-xs transition-colors" style={{ color: G }}>
            ← Back to Home
          </Link>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 bg-[#08111F]/90 backdrop-blur-md md:hidden sticky top-0 z-30" style={{ borderBottom: "1px solid rgba(205,164,94,0.22)" }}>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6" style={{ color: E }} />
            <span className="font-serif font-bold text-lg" style={{ color: T }}>Client Portal</span>
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
      <SOSButton />
    </div>
  );
}
