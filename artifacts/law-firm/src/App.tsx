import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout/Layout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { AdvocateLayout } from "@/components/layout/AdvocateLayout";
import { InternLayout } from "@/components/layout/InternLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
import { OnboardingPage, PortalLogin, PortalMismatch, PortalRegister, StatusPage, VerificationPending } from "@/pages/auth/AuthPages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/access-denied">
        <StatusPage type="denied" />
      </Route>
      <Route path="/account-restricted">
        <StatusPage type="restricted" />
      </Route>
      <Route path="/portal-mismatch">
        <PortalMismatch />
      </Route>

      {/* Legacy public pages */}
      <Route path="/book" component={BookLawyer} />

      {/* Legacy admin routes */}
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/diary">
        <Layout><MyDiary /></Layout>
      </Route>
      <Route path="/proxy-hub">
        <Layout><ProxyHub /></Layout>
      </Route>
      <Route path="/intern-quests">
        <Layout><InternQuests /></Layout>
      </Route>
      <Route path="/revenue-tracker">
        <Layout><RevenueTracker /></Layout>
      </Route>
      <Route path="/bookings">
        <Layout><Bookings /></Layout>
      </Route>
      <Route path="/users">
        <Layout><Users /></Layout>
      </Route>
      <Route path="/legal-library">
        <Layout><LegalLibrary /></Layout>
      </Route>

      {/* CLIENT PORTAL */}
      <Route path="/client/login">
        <PortalLogin portal="client" />
      </Route>
      <Route path="/client/register">
        <PortalRegister portal="client" />
      </Route>
      <Route path="/client/onboarding">
        <OnboardingPage portal="client" />
      </Route>
      <Route path="/client/dashboard">
        <ProtectedRoute allowedRoles={["client"]}>
          <ClientLayout><ClientHome /></ClientLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client">
        <ProtectedRoute allowedRoles={["client"]}>
          <ClientLayout><ClientHome /></ClientLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client/connect">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientConnectChat /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/wellness">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientWellness /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/rights">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientRightsFeed /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/cases">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientCaseTracker /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/book">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientBookAdvocate /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/reminders">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientReminders /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/legal-guide">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientLegalGuide /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/diy-docs">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientDIYDocs /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/ai-assistant">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientAIAssistant /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/lawbot">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientLawBot /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/chat">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientChat /></ClientLayout></ProtectedRoute>
      </Route>
      <Route path="/client/library">
        <ProtectedRoute allowedRoles={["client"]}><ClientLayout><ClientLibrary /></ClientLayout></ProtectedRoute>
      </Route>

      {/* ADVOCATE PORTAL */}
      <Route path="/advocate/login">
        <PortalLogin portal="advocate" />
      </Route>
      <Route path="/advocate/register">
        <PortalRegister portal="advocate" />
      </Route>
      <Route path="/advocate/onboarding">
        <OnboardingPage portal="advocate" />
      </Route>
      <Route path="/advocate/verification-pending">
        <VerificationPending portal="advocate" />
      </Route>
      <Route path="/advocate/dashboard">
        <ProtectedRoute allowedRoles={["advocate", "rna"]}>
          <AdvocateLayout><AdvocateDashboard /></AdvocateLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/advocate">
        <ProtectedRoute allowedRoles={["advocate", "rna"]}>
          <AdvocateLayout><AdvocateDashboard /></AdvocateLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/advocate/calls">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateCalls /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/diary">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateDiary /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/proxy">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateProxy /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/reminders">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateReminders /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/bookings">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateBookings /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/library">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateLibrary /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/revenue">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateRevenue /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/team">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateTeam /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/chat">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateChat /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/lawbot">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateLawBot /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/judges">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateJudges /></AdvocateLayout></ProtectedRoute>
      </Route>
      <Route path="/advocate/cases">
        <ProtectedRoute allowedRoles={["advocate", "rna"]} requireVerification><AdvocateLayout><AdvocateCaseTracker /></AdvocateLayout></ProtectedRoute>
      </Route>

      {/* INTERN PORTAL */}
      <Route path="/intern/login">
        <PortalLogin portal="intern" />
      </Route>
      <Route path="/intern/register">
        <PortalRegister portal="intern" />
      </Route>
      <Route path="/intern/onboarding">
        <OnboardingPage portal="intern" />
      </Route>
      <Route path="/intern/verification-pending">
        <VerificationPending portal="intern" />
      </Route>
      <Route path="/intern/dashboard">
        <ProtectedRoute allowedRoles={["intern"]}>
          <InternLayout><InternDashboard /></InternLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/intern">
        <ProtectedRoute allowedRoles={["intern"]}>
          <InternLayout><InternDashboard /></InternLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/intern/quests">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternQuestsPage /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/xp">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternXP /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/leaderboard">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternLeaderboard /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/badges">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternBadges /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/doubts">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternDoubtPortal /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/ai-assistant">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternAIAssistant /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/library">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternLibrary /></InternLayout></ProtectedRoute>
      </Route>
      <Route path="/intern/cases">
        <ProtectedRoute allowedRoles={["intern"]} requireVerification><InternLayout><InternCaseTracker /></InternLayout></ProtectedRoute>
      </Route>

      {/* ADMIN PORTAL */}
      <Route path="/admin/login">
        <PortalLogin portal="admin" />
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <StatusPage type="admin" />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
