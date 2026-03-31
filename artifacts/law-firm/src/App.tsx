import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

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
import { ClientChat } from "@/pages/client/ClientChat";

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

import { InternDashboard } from "@/pages/intern/InternDashboard";
import { InternQuestsPage } from "@/pages/intern/InternQuestsPage";
import { InternXP } from "@/pages/intern/InternXP";
import { InternLeaderboard } from "@/pages/intern/InternLeaderboard";
import { InternBadges } from "@/pages/intern/InternBadges";
import { InternLibrary } from "@/pages/intern/InternLibrary";
import { InternDoubtPortal } from "@/pages/intern/InternDoubtPortal";
import { InternAIAssistant } from "@/pages/intern/InternAIAssistant";

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
      <Route path="/client">
        <ClientLayout><ClientHome /></ClientLayout>
      </Route>
      <Route path="/client/book">
        <ClientLayout><ClientBookAdvocate /></ClientLayout>
      </Route>
      <Route path="/client/reminders">
        <ClientLayout><ClientReminders /></ClientLayout>
      </Route>
      <Route path="/client/legal-guide">
        <ClientLayout><ClientLegalGuide /></ClientLayout>
      </Route>
      <Route path="/client/diy-docs">
        <ClientLayout><ClientDIYDocs /></ClientLayout>
      </Route>
      <Route path="/client/ai-assistant">
        <ClientLayout><ClientAIAssistant /></ClientLayout>
      </Route>
      <Route path="/client/chat">
        <ClientLayout><ClientChat /></ClientLayout>
      </Route>
      <Route path="/client/library">
        <ClientLayout><ClientLibrary /></ClientLayout>
      </Route>

      {/* ADVOCATE PORTAL */}
      <Route path="/advocate">
        <AdvocateLayout><AdvocateDashboard /></AdvocateLayout>
      </Route>
      <Route path="/advocate/calls">
        <AdvocateLayout><AdvocateCalls /></AdvocateLayout>
      </Route>
      <Route path="/advocate/diary">
        <AdvocateLayout><AdvocateDiary /></AdvocateLayout>
      </Route>
      <Route path="/advocate/proxy">
        <AdvocateLayout><AdvocateProxy /></AdvocateLayout>
      </Route>
      <Route path="/advocate/reminders">
        <AdvocateLayout><AdvocateReminders /></AdvocateLayout>
      </Route>
      <Route path="/advocate/bookings">
        <AdvocateLayout><AdvocateBookings /></AdvocateLayout>
      </Route>
      <Route path="/advocate/library">
        <AdvocateLayout><AdvocateLibrary /></AdvocateLayout>
      </Route>
      <Route path="/advocate/revenue">
        <AdvocateLayout><AdvocateRevenue /></AdvocateLayout>
      </Route>
      <Route path="/advocate/team">
        <AdvocateLayout><AdvocateTeam /></AdvocateLayout>
      </Route>
      <Route path="/advocate/chat">
        <AdvocateLayout><AdvocateChat /></AdvocateLayout>
      </Route>

      {/* INTERN PORTAL */}
      <Route path="/intern">
        <InternLayout><InternDashboard /></InternLayout>
      </Route>
      <Route path="/intern/quests">
        <InternLayout><InternQuestsPage /></InternLayout>
      </Route>
      <Route path="/intern/xp">
        <InternLayout><InternXP /></InternLayout>
      </Route>
      <Route path="/intern/leaderboard">
        <InternLayout><InternLeaderboard /></InternLayout>
      </Route>
      <Route path="/intern/badges">
        <InternLayout><InternBadges /></InternLayout>
      </Route>
      <Route path="/intern/doubts">
        <InternLayout><InternDoubtPortal /></InternLayout>
      </Route>
      <Route path="/intern/ai-assistant">
        <InternLayout><InternAIAssistant /></InternLayout>
      </Route>
      <Route path="/intern/library">
        <InternLayout><InternLibrary /></InternLayout>
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
