import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  Briefcase, 
  Users, 
  Menu, 
  X,
  Scale,
  Home,
  Library,
  Target,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Diary", href: "/diary", icon: BookOpen },
  { name: "Proxy Hub", href: "/proxy-hub", icon: Briefcase },
  { name: "Intern Quests", href: "/intern-quests", icon: Target },
  { name: "Revenue Tracker", href: "/revenue-tracker", icon: BarChart3 },
  { name: "Legal Library", href: "/legal-library", icon: Library },
  { name: "Users", href: "/users", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
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
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-sidebar-border/50 bg-sidebar/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg leading-tight text-sidebar-foreground tracking-wide">Rishika Nagpal & Associates</span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Legal Connect App</span>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-sidebar-foreground hover:text-primary transition-colors p-2"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <div className="px-3 mb-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Firm Management
          </div>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "text-primary bg-primary/10 border border-primary/20 shadow-inner" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" 
                  />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              RN
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Founder & Admin</span>
              <span className="text-xs text-muted-foreground">rishika@rna.law</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-md md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold text-lg">RNA Connect</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
