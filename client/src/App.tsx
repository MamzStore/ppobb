import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import History from "@/pages/History";
import Placeholder from "@/pages/Placeholder";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/category/:id" component={Category} />
        <Route path="/history" component={History} />
        {/* Placeholder routes for bottom nav items */}
        <Route path="/wallet">
          <Placeholder title="Dompet" />
        </Route>
        <Route path="/profile">
          <Placeholder title="Profil Pengguna" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
