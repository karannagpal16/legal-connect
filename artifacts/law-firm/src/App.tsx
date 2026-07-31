import { lazy, Suspense, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, roleHome, useAuth, type AppRole } from "@/lib/auth";

import { Layout } from "@/components/layout/Layout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { AdvocateLayout } from "@/components/layout/AdvocateLayout";
import { InternLayout } from "@/components/layout/InternLayout";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";

function lazyNamed<T extends Record<string, ComponentType<any>>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazyNamed(() => import("@/pages/Login"), "Login");
const Home = lazyNamed(() => import("@/pages/Home"), "Home");
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
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Private({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return <RequireAuth roles={[role]}>{children}</RequireAuth>;
}

function WorkspaceRedirect() {
  const { session } = useAuth();
  return <Redirect to={session ? roleHome(session.user.role) : "/login"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/app" component={WorkspaceRedirect} />

      {/* Legacy public pages */}
      <Route path="/book"><Private role="client"><BookLawyer /></Private></Route>

      {/* ADMIN PORTAL */}
      <Route path="/admin"><Private role="admin"><Layout><Dashboard /></Layout></Private></Route>
      <Route path="/admin/users"><Private role="admin"><Layout><Users /></Layout></Private></Route>
      <Route path="/admin/verifications"><Private role="admin"><Layout><AdminVerifications /></Layout></Private></Route>
      <Route path="/admin/cases"><Private role="admin"><Layout><MyDiary /></Layout></Private></Route>
      <Route path="/admin/bookings"><Private role="admin"><Layout><Bookings /></Layout></Private></Route>
      <Route path="/admin/missions"><Private role="admin"><Layout><ProxyHub /></Layout></Private></Route>
      <Route path="/admin/revenue"><Private role="admin"><Layout><RevenueTracker /></Layout></Private></Route>
      <Route path="/admin/library"><Private role="admin"><Layout><LegalLibrary /></Layout></Private></Route>

      {/* Legacy admin routes */}
      <Route path="/dashboard">
        <Private role="admin"><Layout><Dashboard /></Layout></Private>
      </Route>
      <Route path="/diary">
        <Private role="admin"><Layout><MyDiary /></Layout></Private>
      </Route>
      <Route path="/proxy-hub">
        <Private role="admin"><Layout><ProxyHub /></Layout></Private>
      </Route>
      <Route path="/intern-quests">
        <Private role="admin"><Layout><InternQuests /></Layout></Private>
      </Route>
      <Route path="/revenue-tracker">
        <Private role="admin"><Layout><RevenueTracker /></Layout></Private>
      </Route>
      <Route path="/bookings">
        <Private role="admin"><Layout><Bookings /></Layout></Private>
      </Route>
      <Route path="/users">
        <Private role="admin"><Layout><Users /></Layout></Private>
      </Route>
      <Route path="/legal-library">
        <Private role="admin"><Layout><LegalLibrary /></Layout></Private>
      </Route>

      {/* CLIENT PORTAL */}
      <Route path="/client">
        <Private role="client"><ClientLayout><ClientHome /></ClientLayout></Private>
      </Route>
      <Route path="/client/connect">
        <Private role="client"><ClientLayout><ClientConnectChat /></ClientLayout></Private>
      </Route>
      <Route path="/client/wellness">
        <Private role="client"><ClientLayout><ClientWellness /></ClientLayout></Private>
      </Route>
      <Route path="/client/rights">
        <Private role="client"><ClientLayout><ClientRightsFeed /></ClientLayout></Private>
      </Route>
      <Route path="/client/cases">
        <Private role="client"><Redirect to="/client" /></Private>
      </Route>
      <Route path="/client/book">
        <Private role="client"><ClientLayout><ClientBookAdvocate /></ClientLayout></Private>
      </Route>
      <Route path="/client/reminders">
        <Private role="client"><ClientLayout><ClientReminders /></ClientLayout></Private>
      </Route>
      <Route path="/client/legal-guide">
        <Private role="client"><ClientLayout><ClientLegalGuide /></ClientLayout></Private>
      </Route>
      <Route path="/client/diy-docs">
        <Private role="client"><ClientLayout><ClientDIYDocs /></ClientLayout></Private>
      </Route>
      <Route path="/client/ai-assistant">
        <Private role="client"><ClientLayout><ClientAIAssistant /></ClientLayout></Private>
      </Route>
      <Route path="/client/lawbot">
        <Private role="client"><ClientLayout><ClientLawBot /></ClientLayout></Private>
      </Route>
      <Route path="/client/chat">
        <Private role="client"><ClientLayout><ClientChat /></ClientLayout></Private>
      </Route>
      <Route path="/client/library">
        <Private role="client"><ClientLayout><ClientLibrary /></ClientLayout></Private>
      </Route>

      {/* ADVOCATE PORTAL */}
      <Route path="/advocate">
        <Private role="advocate"><AdvocateLayout><AdvocateDashboard /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/calls">
        <Private role="advocate"><AdvocateLayout><AdvocateCalls /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/diary">
        <Private role="advocate"><AdvocateLayout><AdvocateDiary /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/proxy">
        <Private role="advocate"><AdvocateLayout><AdvocateProxy /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/reminders">
        <Private role="advocate"><AdvocateLayout><AdvocateReminders /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/bookings">
        <Private role="advocate"><AdvocateLayout><AdvocateBookings /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/library">
        <Private role="advocate"><AdvocateLayout><AdvocateLibrary /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/revenue">
        <Private role="advocate"><AdvocateLayout><AdvocateRevenue /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/team">
        <Private role="advocate"><AdvocateLayout><AdvocateTeam /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/chamber">
        <Private role="advocate"><AdvocateLayout><ChamberVault /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/chat">
        <Private role="advocate"><AdvocateLayout><AdvocateChat /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/lawbot">
        <Private role="advocate"><AdvocateLayout><AdvocateLawBot /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/judges">
        <Private role="advocate"><AdvocateLayout><AdvocateJudges /></AdvocateLayout></Private>
      </Route>
      <Route path="/advocate/cases">
        <Private role="advocate"><AdvocateLayout><AdvocateCaseTracker /></AdvocateLayout></Private>
      </Route>

      {/* INTERN PORTAL */}
      <Route path="/intern">
        <Private role="intern"><InternLayout><InternDashboard /></InternLayout></Private>
      </Route>
      <Route path="/intern/quests">
        <Private role="intern"><InternLayout><InternQuestsPage /></InternLayout></Private>
      </Route>
      <Route path="/intern/xp">
        <Private role="intern"><InternLayout><InternXP /></InternLayout></Private>
      </Route>
      <Route path="/intern/leaderboard">
        <Private role="intern"><InternLayout><InternLeaderboard /></InternLayout></Private>
      </Route>
      <Route path="/intern/badges">
        <Private role="intern"><InternLayout><InternBadges /></InternLayout></Private>
      </Route>
      <Route path="/intern/doubts">
        <Private role="intern"><InternLayout><InternDoubtPortal /></InternLayout></Private>
      </Route>
      <Route path="/intern/ai-assistant">
        <Private role="intern"><InternLayout><InternAIAssistant /></InternLayout></Private>
      </Route>
      <Route path="/intern/library">
        <Private role="intern"><InternLayout><InternLibrary /></InternLayout></Private>
      </Route>
      <Route path="/intern/cases">
        <Private role="intern"><InternLayout><InternCaseTracker /></InternLayout></Private>
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
            <AppErrorBoundary>
              <Suspense fallback={<div className="lc-route-loading"><span className="lc-spinner" /><p>Opening workspace...</p></div>}>
                <Router />
              </Suspense>
            </AppErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
