import { useQuery } from "@tanstack/react-query";
import {
  useGetRevenueAnalytics,
  useListBookings,
  useListCases,
  useListTasks,
  useListUsers,
} from "@workspace/api-client-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  FileSearch,
  Gavel,
  HeartPulse,
  Library,
  Plus,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { asArray, caseCourt, caseNumber, caseTitle, objectNumber } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, StatusPill } from "@/components/dashboard/DashboardParts";
import { HeroActionBanner, pickHeroAction } from "@/components/dashboard/HeroActionBanner";
import { workspaceRequest } from "@/lib/workspace";

type VerificationRow = {
  id: string;
  role: string;
  name: string;
  status: string;
  credentialKind: string;
  createdAt: string;
};

function safeStatus(item: unknown) {
  return item && typeof item === "object" && "status" in item
    ? String((item as { status?: unknown }).status || "")
    : "";
}

export function Dashboard() {
  const { session } = useAuth();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const { data: bookings = [], isLoading: bookingsLoading } = useListBookings();
  const { data: tasks = [], isLoading: tasksLoading } = useListTasks();
  const { data: users = [], isLoading: usersLoading } = useListUsers();
  const { data: analytics } = useGetRevenueAnalytics();
  const verifications = useQuery({
    queryKey: ["admin-verifications-summary"],
    queryFn: () => workspaceRequest<{ ok: boolean; verifications: VerificationRow[] }>("/api/admin/verifications", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 20_000,
  });

  const caseList = asArray(cases).filter(Boolean);
  const bookingList = asArray(bookings).filter(Boolean);
  const taskList = asArray(tasks).filter(Boolean);
  const userList = asArray(users).filter(Boolean);
  const verificationList = asArray(verifications.data?.verifications).filter(Boolean);
  const firstName = session?.user.name?.split(" ")[0] || "Admin";
  const activeCases = caseList.filter((item) => safeStatus(item) === "Active");
  const pendingBookings = bookingList.filter((item) => {
    const status = safeStatus(item).toLowerCase();
    return status === "pending" || status === "paid" || status === "awaiting_assignment";
  });
  const openTasks = taskList.filter((item) => {
    const status = safeStatus(item).toLowerCase();
    return status === "open" || status === "awaiting_admin_assignment" || status === "paid";
  });
  const pendingVerifications = verificationList.filter((item) => safeStatus(item) === "pending");
  const advocates = userList.filter((item) => String((item as { role?: string }).role || "").toLowerCase() === "advocate");
  const escrowHeld = objectNumber(analytics, "totalManagedRevenue") || objectNumber(analytics, "escrowHeld") || pendingBookings.length * 500;

  const heroAction = pickHeroAction([
    pendingBookings.length
      ? {
          tone: "urgent" as const,
          kicker: "Unassigned intakes",
          title: `${pendingBookings.length} booking${pendingBookings.length === 1 ? "" : "s"} need counsel assignment`,
          detail: "Open the intake desk and assign a Bar-verified advocate by live workload.",
          ctaLabel: "Assign now",
          href: "/admin/control",
          icon: Gavel,
        }
      : null,
    pendingVerifications.length
      ? {
          tone: "action" as const,
          kicker: "Credential review",
          title: `${pendingVerifications.length} identity verification${pendingVerifications.length === 1 ? "" : "s"} pending`,
          detail: "Approve or reject masked KYC records before users unlock full access.",
          ctaLabel: "Review verifications",
          href: "/admin/verifications",
          icon: ShieldCheck,
        }
      : null,
    openTasks.length
      ? {
          tone: "action" as const,
          kicker: "Proxy desk",
          title: `${openTasks.length} proxy mission${openTasks.length === 1 ? "" : "s"} need admin action`,
          detail: "Assign proxy counsel, approve proof, or release work holds.",
          ctaLabel: "Open missions",
          href: "/admin/missions",
          icon: BriefcaseBusiness,
        }
      : null,
    {
      tone: "clear" as const,
      kicker: "Platform clear",
      title: "No blocking admin queue items right now",
      detail: `${activeCases.length} active cases · ${advocates.length} advocates on panel.`,
      ctaLabel: "Open ops desk",
      href: "/admin/control",
      icon: Scale,
    },
  ]);

  return (
    <div className="lc-dashboard-stack">
      <HeroActionBanner action={heroAction} />
      <DashboardIntro
        eyebrow="MASTER OPERATIONS CONTROL"
        title={`Platform command for ${firstName}.`}
        description="Assign counsel, update clients as Legal Connect supervisor, and control tasks and escrow from one desk."
        action={{ label: "Open Ops Command", href: "/admin/control", icon: Gavel }}
      />

      <div className="lc-metric-grid lc-metric-grid-four">
        <MetricCard label="Users" value={userList.length} detail="Registered platform accounts" icon={Users} loading={usersLoading} />
        <MetricCard label="Active cases" value={activeCases.length} detail="Matters currently in progress" icon={Scale} tone="gold" loading={casesLoading} />
        <MetricCard label="Intake queue" value={pendingBookings.length} detail="Bookings awaiting counsel assignment" icon={CalendarDays} tone="red" loading={bookingsLoading} />
        <MetricCard label="Proxy desk" value={openTasks.length} detail="Missions awaiting admin action" icon={BriefcaseBusiness} tone="green" loading={tasksLoading} />
      </div>

      <section className="lc-workspace-metrics" aria-label="Operations spotlight">
        <div><ShieldCheck /><span><strong>{pendingVerifications.length}</strong><small>Pending credential reviews</small></span></div>
        <div><Wallet /><span><strong>₹{escrowHeld.toLocaleString("en-IN")}</strong><small>Managed / escrow ledger</small></span></div>
        <div><Users /><span><strong>{advocates.length}</strong><small>Verified advocate pool</small></span></div>
        <div><Activity /><span><strong>{bookingList.length + taskList.length}</strong><small>Live commercial events</small></span></div>
      </section>

      <div className="lc-dashboard-columns">
        <DashboardPanel
          title="Client intake & lawyer assignment"
          detail="Paid and pending bookings ready for counsel allocation"
          action={{ label: "Open Ops Command", href: "/admin/control" }}
        >
          {pendingBookings.length ? (
            <div className="lc-data-list">
              {pendingBookings.slice(0, 6).map((item) => {
                const row = item as { id: string | number; clientName?: string; legalIssueType?: string; specialty?: string; status?: string };
                return (
                  <div className="lc-data-row" key={String(row.id)}>
                    <span className="lc-data-icon"><Gavel /></span>
                    <div>
                      <strong>{row.clientName || "Client intake"}</strong>
                      <small>{row.legalIssueType || row.specialty || "General counsel"} · {safeStatus(row) || "Pending"}</small>
                    </div>
                    <StatusPill tone="warning">Assign</StatusPill>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="Intake queue clear" description="New paid client bookings will appear here for lawyer assignment." />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Bar & university verification"
          detail="Advocate enrollment and intern student ID audits"
          action={{ label: "Open verification portal", href: "/admin/verifications" }}
        >
          {pendingVerifications.length ? (
            <div className="lc-data-list">
              {pendingVerifications.slice(0, 6).map((item) => (
                <div className="lc-data-row" key={item.id}>
                  <span className="lc-data-icon"><ShieldCheck /></span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.role} · {item.credentialKind.replaceAll("_", " ")}</small>
                  </div>
                  <StatusPill tone="warning">Pending</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} title="No pending audits" description="Advocate bar and intern campus credentials are clear." />
          )}
        </DashboardPanel>
      </div>

      <div className="lc-dashboard-columns">
        <DashboardPanel
          title="Escrow payout governance"
          detail="Client fees held in trust until work completion"
          action={{ label: "Open revenue desk", href: "/admin/revenue" }}
        >
          <div className="lc-admin-summary">
            <div>
              <span><Wallet /></span>
              <p>
                <strong>₹{escrowHeld.toLocaleString("en-IN")}</strong>
                <small>Held / managed balance</small>
              </p>
            </div>
            <div>
              <span><Gavel /></span>
              <p>
                <strong>{bookingList.length}</strong>
                <small>Total bookings tracked</small>
              </p>
            </div>
            <div>
              <span><BriefcaseBusiness /></span>
              <p>
                <strong>{openTasks.length}</strong>
                <small>Proxy payouts pending assignment</small>
              </p>
            </div>
          </div>
          <p className="lc-inline-empty" style={{ marginTop: 12 }}>
            Release payouts from Revenue after advocate work completion and client rating confirmation.
          </p>
        </DashboardPanel>

        <DashboardPanel
          title="360° platform activity"
          detail="Recent matters and commercial movement"
          action={{ label: "Proxy missions", href: "/admin/missions" }}
        >
          {caseList.length ? (
            <div className="lc-data-list">
              {caseList.slice(0, 5).map((item) => (
                <div className="lc-data-row" key={String((item as { id: string | number }).id)}>
                  <span className="lc-data-icon"><FileSearch /></span>
                  <div>
                    <strong>{caseTitle(item)}</strong>
                    <small>{caseCourt(item)} · {caseNumber(item)}</small>
                  </div>
                  <StatusPill tone={safeStatus(item) === "Active" ? "success" : "neutral"}>{safeStatus(item) || "Open"}</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Scale} title="No cases yet" description="Cases created by the team will stream into this monitor." />
          )}
        </DashboardPanel>
      </div>

      <section className="lc-quick-grid" aria-label="Control room shortcuts">
        <Link href="/admin/missions" className="lc-quick-action lc-tone-gold">
          <span><Plus /></span>
          <div><strong>Post Proxy Task</strong><small>Create a proxy court appearance</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/bookings" className="lc-quick-action lc-tone-gold">
          <span><CalendarDays /></span>
          <div><strong>Intake desk</strong><small>Assign counsel to paid bookings</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/verifications" className="lc-quick-action">
          <span><ShieldCheck /></span>
          <div><strong>Credential portal</strong><small>Bar Council & campus ID review</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/missions" className="lc-quick-action lc-tone-green">
          <span><BriefcaseBusiness /></span>
          <div><strong>Proxy assignment</strong><small>Match paid proxy tasks to advocates</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/revenue" className="lc-quick-action lc-tone-red">
          <span><BarChart3 /></span>
          <div><strong>Escrow ledger</strong><small>Approve releases and track fees</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/cases" className="lc-quick-action">
          <span><FileSearch /></span>
          <div><strong>Case register</strong><small>Platform-wide matter list</small></div>
          <ArrowRight />
        </Link>
        <Link href="/admin/library" className="lc-quick-action">
          <span><Library /></span>
          <div><strong>Legal library</strong><small>Shared acts and references</small></div>
          <ArrowRight />
        </Link>
      </section>

      <DashboardPanel title="System health" detail="Control-room readiness for live operations">
        <div className="lc-admin-summary">
          <div>
            <span><HeartPulse /></span>
            <p>
              <strong>{session?.token ? "Online" : "Offline"}</strong>
              <small>Admin session / API auth</small>
            </p>
          </div>
          <div>
            <span><Activity /></span>
            <p>
              <strong>{verifications.isError ? "Degraded" : "Ready"}</strong>
              <small>Verification service</small>
            </p>
          </div>
          <div>
            <span><BarChart3 /></span>
            <p>
              <strong>{analytics ? "Synced" : "Waiting"}</strong>
              <small>Revenue analytics feed</small>
            </p>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
