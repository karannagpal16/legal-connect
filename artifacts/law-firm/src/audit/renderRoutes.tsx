import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { AuthProvider } from "@/lib/auth";

import { Dashboard } from "@/pages/Dashboard";
import { Users } from "@/pages/Users";
import { MyDiary } from "@/pages/MyDiary";
import { Bookings } from "@/pages/Bookings";
import { ProxyHub } from "@/pages/ProxyHub";
import { RevenueTracker } from "@/pages/RevenueTracker";
import { LegalLibrary } from "@/pages/LegalLibrary";
import { ClientHome } from "@/pages/client/ClientHome";
import { ClientCaseTracker } from "@/pages/client/ClientCaseTracker";
import { ClientBookAdvocate } from "@/pages/client/ClientBookAdvocate";
import { ClientChat } from "@/pages/client/ClientChat";
import { ClientLawBot } from "@/pages/client/ClientLawBot";
import { ClientDIYDocs } from "@/pages/client/ClientDIYDocs";
import { ClientLibrary } from "@/pages/client/ClientLibrary";
import { ClientConnectChat } from "@/pages/client/ClientConnectChat";
import { ClientWellness } from "@/pages/client/ClientWellness";
import { ClientRightsFeed } from "@/pages/client/ClientRightsFeed";
import { ClientReminders } from "@/pages/client/ClientReminders";
import { ClientLegalGuide } from "@/pages/client/ClientLegalGuide";
import { ClientAIAssistant } from "@/pages/client/ClientAIAssistant";
import { AdvocateDashboard } from "@/pages/advocate/AdvocateDashboard";
import { AdvocateCaseTracker } from "@/pages/advocate/AdvocateCaseTracker";
import { AdvocateDiary } from "@/pages/advocate/AdvocateDiary";
import { AdvocateBookings } from "@/pages/advocate/AdvocateBookings";
import { AdvocateChat } from "@/pages/advocate/AdvocateChat";
import { AdvocateLawBot } from "@/pages/advocate/AdvocateLawBot";
import { AdvocateLibrary } from "@/pages/advocate/AdvocateLibrary";
import { AdvocateCalls } from "@/pages/advocate/AdvocateCalls";
import { AdvocateProxy } from "@/pages/advocate/AdvocateProxy";
import { AdvocateReminders } from "@/pages/advocate/AdvocateReminders";
import { AdvocateRevenue } from "@/pages/advocate/AdvocateRevenue";
import { AdvocateTeam } from "@/pages/advocate/AdvocateTeam";
import { AdvocateJudges } from "@/pages/advocate/AdvocateJudges";
import { ChamberVault } from "@/pages/advocate/ChamberVault";
import { AdminVerifications } from "@/pages/admin/AdminVerifications";
import { InternDashboard } from "@/pages/intern/InternDashboard";
import { InternQuestsPage } from "@/pages/intern/InternQuestsPage";
import { InternCaseTracker } from "@/pages/intern/InternCaseTracker";
import { InternXP } from "@/pages/intern/InternXP";
import { InternAIAssistant } from "@/pages/intern/InternAIAssistant";
import { InternLibrary } from "@/pages/intern/InternLibrary";
import { InternLeaderboard } from "@/pages/intern/InternLeaderboard";
import { InternBadges } from "@/pages/intern/InternBadges";
import { InternDoubtPortal } from "@/pages/intern/InternDoubtPortal";
import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";

const pages: Array<[string, React.ComponentType]> = [
  ["/", Home],
  ["/login", Login],
  ["/admin", Dashboard],
  ["/admin/users", Users],
  ["/admin/verifications", AdminVerifications],
  ["/admin/cases", MyDiary],
  ["/admin/bookings", Bookings],
  ["/admin/missions", ProxyHub],
  ["/admin/revenue", RevenueTracker],
  ["/admin/library", LegalLibrary],
  ["/client", ClientHome],
  ["/client/cases", ClientCaseTracker],
  ["/client/book", ClientBookAdvocate],
  ["/client/chat", ClientChat],
  ["/client/lawbot", ClientLawBot],
  ["/client/diy-docs", ClientDIYDocs],
  ["/client/library", ClientLibrary],
  ["/client/connect", ClientConnectChat],
  ["/client/wellness", ClientWellness],
  ["/client/rights", ClientRightsFeed],
  ["/client/reminders", ClientReminders],
  ["/client/legal-guide", ClientLegalGuide],
  ["/client/ai-assistant", ClientAIAssistant],
  ["/advocate", AdvocateDashboard],
  ["/advocate/cases", AdvocateCaseTracker],
  ["/advocate/chamber", ChamberVault],
  ["/advocate/diary", AdvocateDiary],
  ["/advocate/bookings", AdvocateBookings],
  ["/advocate/chat", AdvocateChat],
  ["/advocate/lawbot", AdvocateLawBot],
  ["/advocate/library", AdvocateLibrary],
  ["/advocate/calls", AdvocateCalls],
  ["/advocate/proxy", AdvocateProxy],
  ["/advocate/reminders", AdvocateReminders],
  ["/advocate/revenue", AdvocateRevenue],
  ["/advocate/team", AdvocateTeam],
  ["/advocate/judges", AdvocateJudges],
  ["/intern", InternDashboard],
  ["/intern/quests", InternQuestsPage],
  ["/intern/cases", InternCaseTracker],
  ["/intern/xp", InternXP],
  ["/intern/ai-assistant", InternAIAssistant],
  ["/intern/library", InternLibrary],
  ["/intern/leaderboard", InternLeaderboard],
  ["/intern/badges", InternBadges],
  ["/intern/doubts", InternDoubtPortal],
];

export function auditPrimaryRoutes() {
  return pages.map(([route, Page]) => {
    try {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, enabled: false } },
      });
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router ssrPath={route}>
              <Page />
            </Router>
          </AuthProvider>
        </QueryClientProvider>,
      );
      if (html.replace(/<[^>]*>/g, "").trim().length < 10) {
        throw new Error("Rendered output is effectively empty");
      }
      return { route, ok: true as const, bytes: html.length };
    } catch (error) {
      return {
        route,
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
