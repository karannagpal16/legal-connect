import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/Login";
import { AuthProvider, RequireAuth, roleHome, useAuth, type AppRole } from "@/lib/auth";

import { Layout } from "@/components/layout/Layout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { AdvocateLayout } from "@/components/layout/AdvocateLayout";
import { InternLayout } from "@/components/layout/InternLayout";

import { Home } from "@/pages/Home";
import { Dashboard } from "@/pages/Dashboard";
import { MyDiary } from "@/pages/MyDiary";
import { ProxyHub } from "@/pages/ProxyHub";
import { InternQuests } from "@/pages/InternQuests";
import { RevenueTracker } from "@/pages/RevenueTracker";
import { Users } from "@/pages/Users";
import { LegalLibrary } from "@/pages/LegalLibrary";
import { BookLawyer } from "@/pages/BookLawyer";
import { Bookings } from "@/pages/Bookings";

import { ClientHome } from "@/pages/client/ClientHome";
import { ClientBookAdvocate } from "@/pages/client/ClientBookAdvocate";
import { ClientReminders } from "@/pages/client/ClientReminders";
import { ClientLibrary } from "@/pages/client/ClientLibrary";
import { ClientLegalGuide } from "@/pages/client/ClientLegalGuide";
import { ClientDIYDocs } from "@/pages/client/ClientDIYDocs";
import { ClientAIAssistant } from "@/pages/client/ClientAIAssistant";
import { ClientLawBot } from "@/pages/client/ClientLawBot";
import { ClientChat } from "@/pages/client/ClientChat";
import { ClientConnectChat } from "@/pages/client/ClientConnectChat";
import { ClientWellness } from "@/pages/client/ClientWellness";
import { ClientRightsFeed } from "@/pages/client/ClientRightsFeed";
import { ClientCaseTracker } from "@/pages/client/ClientCaseTracker";

import { AdvocateDashboard } from "@/pages/advocate/AdvocateDashboard";
import { AdvocateCalls } from "@/pages/advocate/AdvocateCalls";
import { AdvocateDiary } from "@/pages/advocate/AdvocateDiary";
import { AdvocateProxy } from "@/pages/advocate/AdvocateProxy";
import { AdvocateReminders } from "@/pages/advocate/AdvocateReminders";
import { AdvocateBookings } from "@/pages/advocate/AdvocateBookings";
import { AdvocateLibrary } from "@/pages/advocate/AdvocateLibrary";
import { AdvocateRevenue } from "@/pages/advocate/AdvocateRevenue";
import { AdvocateTeam } from "@/pages/advocate/AdvocateTeam";
import { AdvocateChat } from "@/pages/advocate/AdvocateChat";
import { AdvocateLawBot } from "@/pages/advocate/AdvocateLawBot";
import { AdvocateJudges } from "@/pages/advocate/AdvocateJudges";

import { InternDashboard } from "@/pages/intern/InternDashboard";
import { InternQuestsPage } from "@/pages/intern/InternQuestsPage";
import { InternXP } from "@/pages/intern/InternXP";
import { InternLeaderboard } from "@/pages/intern/InternLeaderboard";
import { InternBadges } from "@/pages/intern/InternBadges";
import { InternLibrary } from "@/pages/intern/InternLibrary";
import { InternDoubtPortal } from "@/pages/intern/InternDoubtPortal";
import { InternAIAssistant } from "@/pages/intern/InternAIAssistant";
import { AdvocateCaseTracker } from "@/pages/advocate/AdvocateCaseTracker";
import { InternCaseTracker } from "@/pages/intern/InternCaseTracker";

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
        <Private role="client"><ClientLayout><ClientCaseTracker /></ClientLayout></Private>
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
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
