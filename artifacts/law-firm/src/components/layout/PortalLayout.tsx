import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  FileSearch,
  Gavel,
  Home,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  ReceiptIndianRupee,
  Scale,
  Sparkles,
  Target,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { normaliseRole, useAuth, type AppRole } from "@/lib/auth";
import { SOSButton } from "@/components/SOSButton";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navigation: Record<AppRole, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Cases", href: "/admin/cases", icon: FileSearch },
    { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { label: "Missions", href: "/admin/missions", icon: BriefcaseBusiness },
    { label: "Revenue", href: "/admin/revenue", icon: BarChart3 },
    { label: "Library", href: "/admin/library", icon: Library },
  ],
  advocate: [
    { label: "Dashboard", href: "/advocate", icon: Home },
    { label: "My cases", href: "/advocate/cases", icon: FileSearch },
    { label: "Court diary", href: "/advocate/diary", icon: BookOpen },
    { label: "Bookings", href: "/advocate/bookings", icon: CalendarDays },
    { label: "Messages", href: "/advocate/chat", icon: MessageSquare },
    { label: "LawBot", href: "/advocate/lawbot", icon: Sparkles },
    { label: "Library", href: "/advocate/library", icon: Library },
  ],
  client: [
    { label: "Home", href: "/client", icon: Home },
    { label: "My cases", href: "/client/cases", icon: FileSearch },
    { label: "Find an advocate", href: "/client/book", icon: Gavel },
    { label: "Messages", href: "/client/chat", icon: MessageSquare },
    { label: "LawBot", href: "/client/lawbot", icon: Sparkles },
    { label: "Documents", href: "/client/diy-docs", icon: ReceiptIndianRupee },
    { label: "Library", href: "/client/library", icon: Library },
  ],
  intern: [
    { label: "Dashboard", href: "/intern", icon: Home },
    { label: "My quests", href: "/intern/quests", icon: Target },
    { label: "Case tracker", href: "/intern/cases", icon: FileSearch },
    { label: "XP & progress", href: "/intern/xp", icon: BarChart3 },
    { label: "AI assistant", href: "/intern/ai-assistant", icon: Sparkles },
    { label: "Library", href: "/intern/library", icon: Library },
  ],
};

const roleMeta: Record<AppRole, { title: string; subtitle: string }> = {
  admin: { title: "Admin Control", subtitle: "Platform operations" },
  advocate: { title: "Advocate Workspace", subtitle: "Practice management" },
  client: { title: "Client Workspace", subtitle: "Your legal matters" },
  intern: { title: "Intern Workspace", subtitle: "Learn through practice" },
};

function isActive(location: string, item: NavItem, home: string) {
  if (item.href === home) return location === item.href;
  return location === item.href || location.startsWith(`${item.href}/`);
}

export function PortalLayout({
  role: requiredRole,
  children,
}: {
  role: AppRole;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { session, logout } = useAuth();
  const role = normaliseRole(session?.user.role || requiredRole);
  const items = navigation[role];
  const home = `/${role}`;
  const activeItem = useMemo(
    () => items.find((item) => isActive(location, item, home)) || items[0],
    [home, items, location],
  );
  const name = session?.user.name || roleMeta[role].title;
  const contact = session?.user.emailMasked || session?.user.email || roleMeta[role].subtitle;
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="lc-portal">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            className="lc-sidebar-backdrop"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`lc-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="lc-sidebar-brand">
          <Link href={home}>
            <span className="lc-brand-symbol"><Scale /></span>
            <span><strong>Legal Connect</strong><small>India's Legal OS</small></span>
          </Link>
          <button className="lc-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X /></button>
        </div>

        <div className="lc-workspace-label">
          <span>{roleMeta[role].title}</span>
          <small>{roleMeta[role].subtitle}</small>
        </div>

        <nav className="lc-sidebar-nav" aria-label={`${roleMeta[role].title} navigation`}>
          {items.map((item) => {
            const active = isActive(location, item, home);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={active ? "active" : ""}>
                <item.icon />
                <span>{item.label}</span>
                {active && <ChevronRight className="lc-nav-chevron" />}
              </Link>
            );
          })}
        </nav>

        <div className="lc-sidebar-profile">
          <div className="lc-profile-avatar">{initials || <CircleUserRound />}</div>
          <div className="lc-profile-copy"><strong>{name}</strong><small>{contact}</small></div>
          <button onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut /></button>
        </div>
      </aside>

      <div className="lc-portal-main">
        <header className="lc-portal-header">
          <button className="lc-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div>
            <span>{roleMeta[role].subtitle}</span>
            <h1>{activeItem.label}</h1>
          </div>
          <div className="lc-header-date">
            <small>Today</small>
            <strong>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date())}</strong>
          </div>
        </header>
        <main className="lc-portal-content">
          <motion.div key={location} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </main>
      </div>
      {role === "client" && <SOSButton />}
    </div>
  );
}
