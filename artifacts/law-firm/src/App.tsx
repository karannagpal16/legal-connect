import { Suspense, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, roleHome, useAuth, type AppRole } from "@/lib/auth";
import { lazyDefault, lazyNamed } from "@/lib/lazyRoute";

import { Layout } from "@/components/layout/Layout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { AdvocateLayout } from "@/components/layout/AdvocateLayout";
import { InternLayout } from "@/components/layout/InternLayout";

import { RouteErrorBoundary } from "@/components/AppErrorBoundary";

const NotFound = lazyDefault(() => import("@/pages/not-found"));
const Login = lazyNamed(() => import("@/pages/Login"), "Login");
const Home = lazyNamed(() => import("@/pages/Home"), "Home");
const TransparencyLedger = lazyNamed(() => import("@/pages/TransparencyLedger"), "TransparencyLedger");
const PrivacyPage = lazyNamed(() => import("@/pages/LegalDocPage"), "PrivacyPage");
const TermsPage = lazyNamed(() => import("@/pages/LegalDocPage"), "TermsPage");
const RefundPage = lazyNamed(() => import("@/pages/LegalDocPage"), "RefundPage");
const AccessDeniedPage = lazyNamed(() => import("@/pages/AccessPages"), "AccessDeniedPage");
const AccountRestrictedPage = lazyNamed(() => import("@/pages/AccessPages"), "AccountRestrictedPage");
const Dashboard = lazyNamed(() => import("@/pages/Dashboard"), "Dashboard");
const MyDiary = lazyNamed(() => import("@/pages/MyDiary"), "MyDiary");
const ProxyHub = lazyNamed(() => import("@/pages/ProxyHub"), "ProxyHub");
const RevenueTracker = lazyNamed(() => import("@/pages/RevenueTracker"), "RevenueTracker");
const Users = lazyNamed(() => import("@/pages/Users"), "Users");
const LegalLibrary = lazyNamed(() => import("@/pages/LegalLibrary"), "LegalLibrary");
const BookLawyer = lazyNamed(() => import("@/pages/BookLawyer"), "BookLawyer");
const Bookings = lazyNamed(() => import("@/pages/Bookings"), "Bookings");

const ClientHome = lazyNamed(() => import("@/pages/client/ClientHome"), "ClientHome");
const ClientGrievance = lazyNamed(() => import("@/pages/client/ClientGrievance"), "ClientGrievance");
const ClientEngagement = lazyNamed(() => import("@/pages/client/ClientEngagement"), "ClientEngagement");
const ClientBookAdvocate = lazyNamed(() => import("@/pages/client/ClientBookAdvocate"), "ClientBookAdvocate");
const ClientReminders = lazyNamed(() => import("@/pages/client/ClientReminders"), "ClientReminders");
const ClientLibrary = lazyNamed(() => import("@/pages/client/ClientLibrary"), "ClientLibrary");
const ClientLegalGuide = lazyNamed(() => import("@/pages/client/ClientLegalGuide"), "ClientLegalGuide");
const ClientDIYDocs = lazyNamed(() => import("@/pages/client/ClientDIYDocs"), "ClientDIYDocs");
const ClientAIAssistant = lazyNamed(() => import("@/pages/client/ClientAIAssistant"), "ClientAIAssistant");
const ClientLawBot = lazyNamed(() => import("@/pages/client/ClientLawBot"), "ClientLawBot");
const ClientChat = lazyNamed(() => import("@/pages/client/ClientChat"), "ClientChat");
const ClientConnectChat = lazyNamed(() => import("@/pages/client/ClientConnectChat"), "ClientConnectChat");
const ClientWellness = lazyNamed(() => import("@/pages/client/ClientWellness"), "ClientWellness");
const ClientRightsFeed = lazyNamed(() => import("@/pages/client/ClientRightsFeed"), "ClientRightsFeed");
const ClientCaseTracker = lazyNamed(() => import("@/pages/client/ClientCaseTracker"), "ClientCaseTracker");
const ClientPayments = lazyNamed(() => import("@/pages/client/ClientPayments"), "ClientPayments");

const AdvocateDashboard = lazyNamed(() => import("@/pages/advocate/AdvocateDashboard"), "AdvocateDashboard");
const AdvocateCalls = lazyNamed(() => import("@/pages/advocate/AdvocateCalls"), "AdvocateCalls");
const AdvocateDiary = lazyNamed(() => import("@/pages/advocate/AdvocateDiary"), "AdvocateDiary");
const AdvocateProxy = lazyNamed(() => import("@/pages/advocate/AdvocateProxy"), "AdvocateProxy");
const AdvocateReminders = lazyNamed(() => import("@/pages/advocate/AdvocateReminders"), "AdvocateReminders");
const AdvocateBookings = lazyNamed(() => import("@/pages/advocate/AdvocateBookings"), "AdvocateBookings");
const AdvocateLibrary = lazyNamed(() => import("@/pages/advocate/AdvocateLibrary"), "AdvocateLibrary");
const AdvocateRevenue = lazyNamed(() => import("@/pages/advocate/AdvocateRevenue"), "AdvocateRevenue");
const AdvocateTeam = lazyNamed(() => import("@/pages/advocate/AdvocateTeam"), "AdvocateTeam");
const AdvocateChat = lazyNamed(() => import("@/pages/advocate/AdvocateChat"), "AdvocateChat");
const AdvocateLawBot = lazyNamed(() => import("@/pages/advocate/AdvocateLawBot"), "AdvocateLawBot");
const AdvocateJudges = lazyNamed(() => import("@/pages/advocate/AdvocateJudges"), "AdvocateJudges");
const ChamberVault = lazyNamed(() => import("@/pages/advocate/ChamberVault"), "ChamberVault");
const AdvocateCaseTracker = lazyNamed(() => import("@/pages/advocate/AdvocateCaseTracker"), "AdvocateCaseTracker");
const AdminVerifications = lazyNamed(() => import("@/pages/admin/AdminVerifications"), "AdminVerifications");
const AdminPendingUpdates = lazyNamed(() => import("@/pages/admin/AdminPendingUpdates"), "AdminPendingUpdates");
const AdminControlDesk = lazyNamed(() => import("@/pages/admin/AdminControlDesk"), "AdminControlDesk");
const CaseUpdatesBoard = lazyNamed(() => import("@/pages/CaseUpdatesBoard"), "CaseUpdatesBoard");

const InternDashboard = lazyNamed(() => import("@/pages/intern/InternDashboard"), "InternDashboard");
const InternQuestsPage = lazyNamed(() => import("@/pages/intern/InternQuestsPage"), "InternQuestsPage");
const InternXP = lazyNamed(() => import("@/pages/intern/InternXP"), "InternXP");
const InternLeaderboard = lazyNamed(() => import("@/pages/intern/InternLeaderboard"), "InternLeaderboard");
const InternBadges = lazyNamed(() => import("@/pages/intern/InternBadges"), "InternBadges");
const InternLibrary = lazyNamed(() => import("@/pages/intern/InternLibrary"), "InternLibrary");
const InternDoubtPortal = lazyNamed(() => import("@/pages/intern/InternDoubtPortal"), "InternDoubtPortal");
const InternAIAssistant = lazyNamed(() => import("@/pages/intern/InternAIAssistant"), "InternAIAssistant");
const InternCaseTracker = lazyNamed(() => import("@/pages/intern/InternCaseTracker"), "InternCaseTracker");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Soft nav can race auth/token hydration; one retry avoids "blank until refresh".
      retry: 1,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
  },
});

function Private({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return <RequireAuth roles={[role]}>{children}</RequireAuth>;
}

function WorkspaceRedirect() {
  const { session, ready } = useAuth();
  if (!ready) {
    return (
      <div className="lc-auth-loading" role="status">
        <span className="lc-spinner" />
        <p>Opening your workspace...</p>
      </div>
    );
  }
  return <Redirect to={session ? roleHome(session.user.role) : "/login"} />;
}

function RouteFallback() {
  return (
    <div className="lc-route-loading" role="status">
      <span className="lc-spinner" />
      <p>Opening workspace...</p>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="lc-workspace-loading" role="status">
      <span className="lc-spinner" />
      <p>Loading this screen...</p>
    </div>
  );
}

/** Keep portal chrome mounted; only the page panel suspends on lazy import. */
function PortalPages({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function inPortal(location: string, base: string) {
  return location === base || location.startsWith(`${base}/`);
}

/**
 * Portal shells intentionally avoid wouter `nest`.
 * Nested routers rewrite absolute hrefs (`/admin/control` → `/admin/admin/control`),
 * which produced client-side 404s on every sidebar/CTA click.
 * Full-path routes keep absolute Links working while the layout stays mounted.
 */
function AdminPortal() {
  return (
    <Private role="admin">
      <Layout>
        <PortalPages>
          <Switch>
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/dashboard"><Redirect to="/admin" /></Route>
            <Route path="/admin/control" component={AdminControlDesk} />
            <Route path="/admin/users" component={Users} />
            <Route path="/admin/verifications" component={AdminVerifications} />
            <Route path="/admin/pending-updates" component={AdminPendingUpdates} />
            <Route path="/admin/cases" component={MyDiary} />
            <Route path="/admin/bookings" component={Bookings} />
            <Route path="/admin/missions" component={ProxyHub} />
            <Route path="/admin/revenue" component={RevenueTracker} />
            <Route path="/admin/library" component={LegalLibrary} />
            <Route path="/admin/login"><Redirect to="/login" /></Route>
            <Route path="/admin/onboarding"><Redirect to="/admin" /></Route>
            <Route component={NotFound} />
          </Switch>
        </PortalPages>
      </Layout>
    </Private>
  );
}

function ClientPortal() {
  return (
    <Private role="client">
      <ClientLayout>
        <PortalPages>
          <Switch>
            <Route path="/client" component={ClientHome} />
            <Route path="/client/dashboard"><Redirect to="/client" /></Route>
            <Route path="/client/grievance" component={ClientGrievance} />
            <Route path="/client/engagement" component={ClientEngagement} />
            <Route path="/client/updates" component={CaseUpdatesBoard} />
            <Route path="/client/connect" component={ClientConnectChat} />
            <Route path="/client/wellness" component={ClientWellness} />
            <Route path="/client/rights" component={ClientRightsFeed} />
            <Route path="/client/cases" component={ClientCaseTracker} />
            <Route path="/client/book" component={ClientBookAdvocate} />
            <Route path="/client/payments" component={ClientPayments} />
            <Route path="/client/reminders" component={ClientReminders} />
            <Route path="/client/legal-guide" component={ClientLegalGuide} />
            <Route path="/client/diy-docs" component={ClientDIYDocs} />
            <Route path="/client/ai-assistant" component={ClientAIAssistant} />
            <Route path="/client/lawbot" component={ClientLawBot} />
            <Route path="/client/chat" component={ClientChat} />
            <Route path="/client/library" component={ClientLibrary} />
            <Route path="/client/login"><Redirect to="/login" /></Route>
            <Route path="/client/onboarding"><Redirect to="/client" /></Route>
            <Route component={NotFound} />
          </Switch>
        </PortalPages>
      </ClientLayout>
    </Private>
  );
}

function AdvocatePortal() {
  return (
    <Private role="advocate">
      <AdvocateLayout>
        <PortalPages>
          <Switch>
            <Route path="/advocate" component={AdvocateDashboard} />
            <Route path="/advocate/dashboard"><Redirect to="/advocate" /></Route>
            <Route path="/advocate/calls" component={AdvocateCalls} />
            <Route path="/advocate/diary" component={AdvocateDiary} />
            <Route path="/advocate/proxy" component={AdvocateProxy} />
            <Route path="/advocate/reminders" component={AdvocateReminders} />
            <Route path="/advocate/bookings" component={AdvocateBookings} />
            <Route path="/advocate/library" component={AdvocateLibrary} />
            <Route path="/advocate/revenue" component={AdvocateRevenue} />
            <Route path="/advocate/team" component={AdvocateTeam} />
            <Route path="/advocate/chamber" component={ChamberVault} />
            <Route path="/advocate/chat" component={AdvocateChat} />
            <Route path="/advocate/lawbot" component={AdvocateLawBot} />
            <Route path="/advocate/judges" component={AdvocateJudges} />
            <Route path="/advocate/cases" component={AdvocateCaseTracker} />
            <Route path="/advocate/updates" component={CaseUpdatesBoard} />
            <Route path="/advocate/login"><Redirect to="/login" /></Route>
            <Route path="/advocate/onboarding"><Redirect to="/advocate" /></Route>
            <Route path="/advocate/verification-pending"><Redirect to="/advocate" /></Route>
            <Route component={NotFound} />
          </Switch>
        </PortalPages>
      </AdvocateLayout>
    </Private>
  );
}

function InternPortal() {
  return (
    <Private role="intern">
      <InternLayout>
        <PortalPages>
          <Switch>
            <Route path="/intern" component={InternDashboard} />
            <Route path="/intern/dashboard"><Redirect to="/intern" /></Route>
            <Route path="/intern/quests" component={InternQuestsPage} />
            <Route path="/intern/xp" component={InternXP} />
            <Route path="/intern/leaderboard" component={InternLeaderboard} />
            <Route path="/intern/badges" component={InternBadges} />
            <Route path="/intern/doubts" component={InternDoubtPortal} />
            <Route path="/intern/ai-assistant" component={InternAIAssistant} />
            <Route path="/intern/library" component={InternLibrary} />
            <Route path="/intern/cases" component={InternCaseTracker} />
            <Route path="/intern/login"><Redirect to="/login" /></Route>
            <Route path="/intern/onboarding"><Redirect to="/intern" /></Route>
            <Route path="/intern/verification-pending"><Redirect to="/intern" /></Route>
            <Route component={NotFound} />
          </Switch>
        </PortalPages>
      </InternLayout>
    </Private>
  );
}

function Router() {
  const [location] = useLocation();

  if (inPortal(location, "/admin")) return <AdminPortal />;
  if (inPortal(location, "/client")) return <ClientPortal />;
  if (inPortal(location, "/advocate")) return <AdvocatePortal />;
  if (inPortal(location, "/intern")) return <InternPortal />;

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/transparency" component={TransparencyLedger} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/login" component={Login} />
      <Route path="/access-denied" component={AccessDeniedPage} />
      <Route path="/account-restricted" component={AccountRestrictedPage} />
      <Route path="/app" component={WorkspaceRedirect} />

      {/* Legacy public / admin shortcuts */}
      <Route path="/book"><Private role="client"><Suspense fallback={<RouteFallback />}><BookLawyer /></Suspense></Private></Route>
      <Route path="/dashboard"><Redirect to="/admin" /></Route>
      <Route path="/diary"><Redirect to="/admin/cases" /></Route>
      <Route path="/proxy-hub"><Redirect to="/admin/missions" /></Route>
      <Route path="/intern-quests"><Redirect to="/intern/quests" /></Route>
      <Route path="/revenue-tracker"><Redirect to="/admin/revenue" /></Route>
      <Route path="/bookings"><Redirect to="/admin/bookings" /></Route>
      <Route path="/users"><Redirect to="/admin/users" /></Route>
      <Route path="/legal-library"><Redirect to="/admin/library" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RouteErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Router />
              </Suspense>
            </RouteErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
