import { useListBookings, useListCases, useListTasks } from "@workspace/api-client-react";
import { BookOpen, BriefcaseBusiness, CalendarDays, FileSearch, Gavel, MessageSquare, Scale, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { asArray, caseCourt, caseTitle } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, QuickAction, StatusPill } from "@/components/dashboard/DashboardParts";

export function AdvocateDashboard() {
  const { session } = useAuth();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const { data: bookings = [], isLoading: bookingsLoading } = useListBookings();
  const { data: tasks = [], isLoading: tasksLoading } = useListTasks();
  const caseList = asArray(cases);
  const bookingList = asArray(bookings);
  const taskList = asArray(tasks);
  const firstName = session?.user.name?.replace(/^Adv\.\s*/i, "").split(" ")[0] || "Counsel";
  const activeCases = caseList.filter((item) => item.status === "Active");
  const pendingBookings = bookingList.filter((item) => item.status === "Pending");
  const openMissions = taskList.filter((item) => item.status === "Open");
  const upcoming = activeCases.filter((item) => item.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));

  return (
    <div className="lc-dashboard-stack">
      <DashboardIntro
        eyebrow="ADVOCATE DASHBOARD"
        title={`Welcome back, ${firstName}.`}
        description={upcoming[0] ? `Next listed matter: ${caseTitle(upcoming[0])}.` : "Your practice overview is clear. No listed hearing needs immediate attention."}
        action={{ label: "Open court diary", href: "/advocate/diary", icon: CalendarDays }}
      />

      <div className="lc-metric-grid lc-metric-grid-four">
        <MetricCard label="Active cases" value={activeCases.length} detail="Assigned matters in progress" icon={Scale} loading={casesLoading} />
        <MetricCard label="Listed hearings" value={upcoming.length} detail="Cases with upcoming dates" icon={CalendarDays} tone="gold" loading={casesLoading} />
        <MetricCard label="New bookings" value={pendingBookings.length} detail="Requests awaiting a response" icon={Gavel} tone="red" loading={bookingsLoading} />
        <MetricCard label="Open missions" value={openMissions.length} detail="Available court tasks" icon={BriefcaseBusiness} tone="green" loading={tasksLoading} />
      </div>

      <section className="lc-quick-grid">
        <QuickAction title="My cases" description="Open case files and next actions" href="/advocate/cases" icon={FileSearch} />
        <QuickAction title="Court diary" description="Review hearings and deadlines" href="/advocate/diary" icon={BookOpen} tone="gold" />
        <QuickAction title="Client messages" description="Continue active conversations" href="/advocate/chat" icon={MessageSquare} tone="green" />
        <QuickAction title="LawBot research" description="Search approved legal sources" href="/advocate/lawbot" icon={Sparkles} />
      </section>

      <div className="lc-dashboard-columns">
        <DashboardPanel title="Upcoming hearings" detail="Your next listed matters" action={{ label: "Open diary", href: "/advocate/diary" }}>
          {upcoming.length ? (
            <div className="lc-data-list">
              {upcoming.slice(0, 5).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-date-tile"><strong>{new Date(item.nextDate!).getDate()}</strong><small>{new Date(item.nextDate!).toLocaleDateString("en-IN", { month: "short" })}</small></span>
                  <div><strong>{caseTitle(item)}</strong><small>{caseCourt(item)}</small></div>
                  <StatusPill tone="warning">Listed</StatusPill>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={CalendarDays} title="No listed hearings" description="New hearing dates will appear here automatically." />}
        </DashboardPanel>

        <DashboardPanel title="Booking requests" detail="Consultations needing attention" action={{ label: "Manage bookings", href: "/advocate/bookings" }}>
          {pendingBookings.length ? (
            <div className="lc-data-list">
              {pendingBookings.slice(0, 5).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-data-icon"><Gavel /></span>
                  <div><strong>{item.clientName}</strong><small>{item.legalIssueType} · {item.preferredTime}</small></div>
                  <StatusPill tone="warning">Pending</StatusPill>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Gavel} title="No pending requests" description="New client booking requests will appear here." />}
        </DashboardPanel>
      </div>
    </div>
  );
}
