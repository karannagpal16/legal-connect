import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
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
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Vault,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { normaliseRole, useAuth, type AppRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { SOSButton } from "@/components/SOSButton";
import { usePlatformLiveSync } from "@/hooks/usePlatformEvents";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface PortalNotification {
  id: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt?: string | null;
  priority?: string;
}

const navigation: Record<AppRole, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Ops Command", href: "/admin/control", icon: Gavel },
    { label: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
    { label: "LC review", href: "/admin/pending-updates", icon: MessageSquare },
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
    { label: "Case updates", href: "/advocate/updates", icon: MessageSquare },
    { label: "Chamber Vault", href: "/advocate/chamber", icon: Vault },
    { label: "Court diary", href: "/advocate/diary", icon: BookOpen },
    { label: "Proxy Hub", href: "/advocate/proxy", icon: BriefcaseBusiness },
    { label: "Bookings", href: "/advocate/bookings", icon: CalendarDays },
    { label: "LawBot", href: "/advocate/lawbot", icon: Sparkles },
    { label: "Library", href: "/advocate/library", icon: Library },
  ],
  client: [
    { label: "Home", href: "/client", icon: Home },
    { label: "Get legal help", href: "/client/book", icon: Gavel },
    { label: "Case updates", href: "/client/updates", icon: FileSearch },
    { label: "Message LC", href: "/client/chat", icon: MessageSquare },
    { label: "LawBot", href: "/client/lawbot", icon: Sparkles },
    { label: "Templates", href: "/client/diy-docs", icon: ReceiptIndianRupee },
    { label: "Engagement", href: "/client/engagement", icon: FileSearch },
    { label: "Grievance", href: "/client/grievance", icon: ShieldCheck },
    { label: "Library", href: "/client/library", icon: Library },
  ],
  intern: [
    { label: "Dashboard", href: "/intern", icon: Home },
    { label: "My quests", href: "/intern/quests", icon: Target },
    { label: "Case tracker", href: "/intern/cases", icon: FileSearch },
    { label: "XP & progress", href: "/intern/xp", icon: BarChart3 },
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

function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

function NotificationBell({ token }: { token?: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread-count", token],
    queryFn: () => workspaceRequest<{ count: number }>("/api/notifications/unread-count", token),
    enabled: Boolean(token),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const feedQuery = useQuery({
    queryKey: ["notifications-feed", token],
    queryFn: () => workspaceRequest<PortalNotification[]>("/api/notifications", token),
    enabled: Boolean(token) && open,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unreadCount = unreadQuery.data?.count || 0;
  const notifications = (feedQuery.data || []).slice(0, 20);

  const refreshBell = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", token] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-feed", token] }),
    ]);
  };

  const markOneRead = async (id: string) => {
    await workspaceRequest(`/api/notifications/${encodeURIComponent(id)}/read`, token, { method: "POST" });
    await refreshBell();
  };

  const markAllRead = async () => {
    await workspaceRequest("/api/notifications/read-all", token, { method: "POST" });
    await refreshBell();
  };

  return (
    <div className="lc-notify-bell" ref={panelRef}>
      <button
        type="button"
        className="lc-notify-trigger"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell />
        {unreadCount > 0 ? <span className="lc-notify-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="lc-notify-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="lc-notify-panel-head">
              <strong>Notifications</strong>
              <button type="button" onClick={markAllRead} disabled={unreadCount === 0}>
                <CheckCheck /> Mark all read
              </button>
            </div>
            <div className="lc-notify-list">
              {feedQuery.isLoading ? (
                <p className="lc-notify-empty">Loading updates…</p>
              ) : notifications.length === 0 ? (
                <p className="lc-notify-empty">No notifications yet.</p>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`lc-notify-item ${item.readAt ? "" : "unread"}`}
                    onClick={() => {
                      if (!item.readAt) void markOneRead(item.id);
                    }}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.message}</small>
                    </span>
                    <em>{formatRelativeTime(item.createdAt)}</em>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
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
  usePlatformLiveSync(2500);
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
          <div className="lc-header-actions">
            <NotificationBell token={session?.token} />
            <div className="lc-header-date">
              <small>Today</small>
              <strong>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date())}</strong>
            </div>
          </div>
        </header>
        <main className="lc-portal-content">
          {/* Avoid remounting the whole page tree on every location tick — that forced blank states until refresh. */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </main>
      </div>
      {role === "client" && <SOSButton />}
    </div>
  );
}
