import { useListBookings, useListCases } from "@workspace/api-client-react";
import { BookOpen, CalendarDays, FileSearch, Gavel, MessageSquare, Scale, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { asArray, caseCourt, caseNumber, caseTitle } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, QuickAction, StatusPill } from "@/components/dashboard/DashboardParts";

export function ClientHome() {
  const { session } = useAuth();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const { data: bookings = [], isLoading: bookingsLoading } = useListBookings();
  const caseList = asArray(cases);
  const bookingList = asArray(bookings);
  const firstName = session?.user.name?.split(" ")[0] || "there";
  const activeCases = caseList.filter((item) => item.status === "Active");
  const upcoming = activeCases.filter((item) => item.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const openBookings = bookingList.filter((item) => ["Pending", "Confirmed"].includes(item.status));

  return (
    <div className="lc-dashboard-stack">
      <DashboardIntro
        eyebrow="CLIENT DASHBOARD"
        title={`Good to see you, ${firstName}.`}
        description={upcoming[0]?.nextDate ? `Your next listed matter is on ${new Date(upcoming[0].nextDate!).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.` : "Your matters, bookings, and legal help are organised here."}
        action={{ label: "Find an advocate", href: "/client/book", icon: Gavel }}
      />

      <div className="lc-metric-grid">
        <MetricCard label="Active matters" value={activeCases.length} detail="Cases currently in progress" icon={Scale} loading={casesLoading} />
        <MetricCard label="Upcoming dates" value={upcoming.length} detail="Hearings with a listed date" icon={CalendarDays} tone="gold" loading={casesLoading} />
        <MetricCard label="Open bookings" value={openBookings.length} detail="Pending or confirmed requests" icon={Gavel} tone="green" loading={bookingsLoading} />
      </div>

      <section className="lc-quick-grid">
        <QuickAction title="Find an advocate" description="Search by practice area and availability" href="/client/book" icon={Gavel} tone="gold" />
        <QuickAction title="Ask LawBot" description="Research approved legal sources" href="/client/lawbot" icon={Sparkles} />
        <QuickAction title="Open messages" description="Continue your advocate conversations" href="/client/chat" icon={MessageSquare} tone="green" />
        <QuickAction title="Legal SOS" description="Get help with an urgent legal situation" href="/client/connect" icon={ShieldAlert} tone="red" />
      </section>

      <div className="lc-dashboard-columns">
        <DashboardPanel title="Your active matters" detail="Latest case position" action={{ label: "View all cases", href: "/client/cases" }}>
          {activeCases.length ? (
            <div className="lc-data-list">
              {activeCases.slice(0, 4).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-data-icon"><FileSearch /></span>
                  <div><strong>{caseTitle(item)}</strong><small>{caseCourt(item)} · {caseNumber(item)}</small></div>
                  <StatusPill tone="success">{item.status}</StatusPill>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={BookOpen} title="No active matters" description="Cases assigned to your account will appear here." />}
        </DashboardPanel>

        <DashboardPanel title="Booking requests" detail="Your recent consultation activity" action={{ label: "Book counsel", href: "/client/book" }}>
          {bookingList.length ? (
            <div className="lc-data-list">
              {bookingList.slice(0, 4).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-data-icon"><Gavel /></span>
                  <div><strong>{item.legalIssueType} consultation</strong><small>{new Date(item.preferredDate).toLocaleDateString("en-IN")} · {item.preferredTime}</small></div>
                  <StatusPill tone={item.status === "Confirmed" ? "success" : item.status === "Cancelled" ? "danger" : "warning"}>{item.status}</StatusPill>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Gavel} title="No booking requests" description="Choose Find an advocate when you need a consultation." />}
        </DashboardPanel>
      </div>
    </div>
  );
}
