import { useGetRevenueAnalytics, useListBookings, useListCases, useListTasks, useListUsers } from "@workspace/api-client-react";
import { BarChart3, BriefcaseBusiness, CalendarDays, FileSearch, Gavel, Library, Scale, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { asArray, caseCourt, caseNumber, caseTitle, objectNumber } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, QuickAction, StatusPill } from "@/components/dashboard/DashboardParts";

export function Dashboard() {
  const { session } = useAuth();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const { data: bookings = [], isLoading: bookingsLoading } = useListBookings();
  const { data: tasks = [], isLoading: tasksLoading } = useListTasks();
  const { data: users = [], isLoading: usersLoading } = useListUsers();
  const { data: analytics } = useGetRevenueAnalytics();
  const caseList = asArray(cases);
  const bookingList = asArray(bookings);
  const taskList = asArray(tasks);
  const userList = asArray(users);
  const firstName = session?.user.name?.split(" ")[0] || "Admin";
  const activeCases = caseList.filter((item) => item.status === "Active");
  const pendingBookings = bookingList.filter((item) => item.status === "Pending");
  const openTasks = taskList.filter((item) => item.status === "Open");

  return (
    <div className="lc-dashboard-stack">
      <DashboardIntro
        eyebrow="ADMIN CONTROL"
        title={`Platform overview for ${firstName}.`}
        description="Users, cases, bookings, and missions are summarised here without unnecessary noise."
        action={{ label: "Manage users", href: "/admin/users", icon: Users }}
      />

      <div className="lc-metric-grid lc-metric-grid-four">
        <MetricCard label="Users" value={userList.length} detail="Registered platform accounts" icon={Users} loading={usersLoading} />
        <MetricCard label="Active cases" value={activeCases.length} detail="Matters currently in progress" icon={Scale} tone="gold" loading={casesLoading} />
        <MetricCard label="Pending bookings" value={pendingBookings.length} detail="Requests awaiting action" icon={CalendarDays} tone="red" loading={bookingsLoading} />
        <MetricCard label="Open missions" value={openTasks.length} detail="Court tasks available" icon={BriefcaseBusiness} tone="green" loading={tasksLoading} />
      </div>

      <section className="lc-quick-grid">
        <QuickAction title="Manage users" description="Accounts, roles, and access" href="/admin/users" icon={Users} />
        <QuickAction title="Review cases" description="Open the platform case list" href="/admin/cases" icon={FileSearch} tone="gold" />
        <QuickAction title="Bookings" description="Confirm or close consultation requests" href="/admin/bookings" icon={Gavel} tone="green" />
        <QuickAction title="Legal library" description="Open shared legal references" href="/admin/library" icon={Library} />
      </section>

      <div className="lc-dashboard-columns">
        <DashboardPanel title="Recent cases" detail="Latest matters in the platform" action={{ label: "View all cases", href: "/admin/cases" }}>
          {caseList.length ? (
            <div className="lc-data-list">
              {caseList.slice(0, 5).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-data-icon"><FileSearch /></span>
                  <div><strong>{caseTitle(item)}</strong><small>{caseCourt(item)} · {caseNumber(item)}</small></div>
                  <StatusPill tone={item.status === "Active" ? "success" : "neutral"}>{item.status}</StatusPill>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Scale} title="No cases yet" description="Cases created by the team will appear here." />}
        </DashboardPanel>

        <DashboardPanel title="Operations" detail="Commercial and mission activity" action={{ label: "Open revenue", href: "/admin/revenue" }}>
          <div className="lc-admin-summary">
            <div><span><BarChart3 /></span><p><strong>₹{objectNumber(analytics, "totalManagedRevenue").toLocaleString("en-IN")}</strong><small>Managed revenue</small></p></div>
            <div><span><Gavel /></span><p><strong>{bookingList.length}</strong><small>Total bookings</small></p></div>
            <div><span><BriefcaseBusiness /></span><p><strong>{taskList.length}</strong><small>Total missions</small></p></div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
