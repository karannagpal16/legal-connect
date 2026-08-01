import { Suspense, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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
const Dashboard = lazyNamed(() => import("@/pages/Dashboard"), "Dashboard");
const MyDiary = lazyNamed(() => import("@/pages/MyDiary"), "MyDiary");
const ProxyHub = lazyNamed(() => import("@/pages/ProxyHub"), "ProxyHub");
const InternQuests = lazyNamed(() => import("@/pages/InternQuests"), "InternQuests");
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/transparency" component={TransparencyLedger} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/login" component={Login} />
      <Route path="/app" component={WorkspaceRedirect} />

      {/* Legacy public pages */}
      <Route path="/book"><Private role="client"><Suspense fallback={<RouteFallback />}><BookLawyer /></Suspense></Private></Route>

      {/* ADMIN PORTAL — nested so sidebar stays while pages lazy-load */}
      <Route path="/admin" nest>
        <Private role="admin">
          <Layout>
            <PortalPages>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/control" component={AdminControlDesk} />
                <Route path="/users" component={Users} />
                <Route path="/verifications" component={AdminVerifications} />
                <Route path="/pending-updates" component={AdminPendingUpdates} />
                <Route path="/cases" component={MyDiary} />
                <Route path="/bookings" component={Bookings} />
                <Route path="/missions" component={ProxyHub} />
                <Route path="/revenue" component={RevenueTracker} />
                <Route path="/library" component={LegalLibrary} />
                <Route component={NotFound} />
              </Switch>
            </PortalPages>
          </Layout>
        </Private>
      </Route>

      {/* Legacy admin routes */}
      <Route path="/dashboard">
        <Private role="admin"><Layout><PortalPages><Dashboard /></PortalPages></Layout></Private>
      </Route>
      <Route path="/diary">
        <Private role="admin"><Layout><PortalPages><MyDiary /></PortalPages></Layout></Private>
      </Route>
      <Route path="/proxy-hub">
        <Private role="admin"><Layout><PortalPages><ProxyHub /></PortalPages></Layout></Private>
      </Route>
      <Route path="/intern-quests">
        <Private role="admin"><Layout><PortalPages><InternQuests /></PortalPages></Layout></Private>
      </Route>
      <Route path="/revenue-tracker">
        <Private role="admin"><Layout><PortalPages><RevenueTracker /></PortalPages></Layout></Private>
      </Route>
      <Route path="/bookings">
        <Private role="admin"><Layout><PortalPages><Bookings /></PortalPages></Layout></Private>
      </Route>
      <Route path="/users">
        <Private role="admin"><Layout><PortalPages><Users /></PortalPages></Layout></Private>
      </Route>
      <Route path="/legal-library">
        <Private role="admin"><Layout><PortalPages><LegalLibrary /></PortalPages></Layout></Private>
      </Route>

      {/* CLIENT PORTAL */}
      <Route path="/client" nest>
        <Private role="client">
          <ClientLayout>
            <PortalPages>
              <Switch>
                <Route path="/" component={ClientHome} />
                <Route path="/grievance" component={ClientGrievance} />
                <Route path="/engagement" component={ClientEngagement} />
                <Route path="/updates" component={CaseUpdatesBoard} />
                <Route path="/connect" component={ClientConnectChat} />
                <Route path="/wellness" component={ClientWellness} />
                <Route path="/rights" component={ClientRightsFeed} />
                <Route path="/cases"><Redirect to="/client" /></Route>
                <Route path="/book" component={ClientBookAdvocate} />
                <Route path="/reminders" component={ClientReminders} />
                <Route path="/legal-guide" component={ClientLegalGuide} />
                <Route path="/diy-docs" component={ClientDIYDocs} />
                <Route path="/ai-assistant" component={ClientAIAssistant} />
                <Route path="/lawbot" component={ClientLawBot} />
                <Route path="/chat" component={ClientChat} />
                <Route path="/library" component={ClientLibrary} />
                <Route component={NotFound} />
              </Switch>
            </PortalPages>
          </ClientLayout>
        </Private>
      </Route>

      {/* ADVOCATE PORTAL */}
      <Route path="/advocate" nest>
        <Private role="advocate">
          <AdvocateLayout>
            <PortalPages>
              <Switch>
                <Route path="/" component={AdvocateDashboard} />
                <Route path="/calls" component={AdvocateCalls} />
                <Route path="/diary" component={AdvocateDiary} />
                <Route path="/proxy" component={AdvocateProxy} />
                <Route path="/reminders" component={AdvocateReminders} />
                <Route path="/bookings" component={AdvocateBookings} />
                <Route path="/library" component={AdvocateLibrary} />
                <Route path="/revenue" component={AdvocateRevenue} />
                <Route path="/team" component={AdvocateTeam} />
                <Route path="/chamber" component={ChamberVault} />
                <Route path="/chat" component={AdvocateChat} />
                <Route path="/lawbot" component={AdvocateLawBot} />
                <Route path="/judges" component={AdvocateJudges} />
                <Route path="/cases" component={AdvocateCaseTracker} />
                <Route path="/updates" component={CaseUpdatesBoard} />
                <Route component={NotFound} />
              </Switch>
            </PortalPages>
          </AdvocateLayout>
        </Private>
      </Route>

      {/* INTERN PORTAL */}
      <Route path="/intern" nest>
        <Private role="intern">
          <InternLayout>
            <PortalPages>
              <Switch>
                <Route path="/" component={InternDashboard} />
                <Route path="/quests" component={InternQuestsPage} />
                <Route path="/xp" component={InternXP} />
                <Route path="/leaderboard" component={InternLeaderboard} />
                <Route path="/badges" component={InternBadges} />
                <Route path="/doubts" component={InternDoubtPortal} />
                <Route path="/ai-assistant" component={InternAIAssistant} />
                <Route path="/library" component={InternLibrary} />
                <Route path="/cases" component={InternCaseTracker} />
                <Route component={NotFound} />
              </Switch>
            </PortalPages>
          </InternLayout>
        </Private>
      </Route>

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
