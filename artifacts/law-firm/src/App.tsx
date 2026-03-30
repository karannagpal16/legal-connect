import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { Dashboard } from "@/pages/Dashboard";
import { MyDiary } from "@/pages/MyDiary";
import { ProxyHub } from "@/pages/ProxyHub";
import { Users } from "@/pages/Users";
import { LegalLibrary } from "@/pages/LegalLibrary";

// Custom QueryClient setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Protected/Admin Routes wrapped in Layout */}
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/diary">
        <Layout><MyDiary /></Layout>
      </Route>
      <Route path="/proxy-hub">
        <Layout><ProxyHub /></Layout>
      </Route>
      <Route path="/users">
        <Layout><Users /></Layout>
      </Route>
      <Route path="/legal-library">
        <Layout><LegalLibrary /></Layout>
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
