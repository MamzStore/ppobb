import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import Topup from "@/pages/Topup";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useMe } from "@/hooks/use-auth";

function ProtectedRoute({ component: Component, adminOnly = false }: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { data: user, isLoading } = useMe();

  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  const [location] = useLocation();
  const { data: user, isLoading } = useMe();

  const isAuthPage = location === "/login" || location === "/register";

  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
      </Switch>
    );
  }

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/topup" component={Topup} />
        <Route path="/category/:id" component={Category} />
        <Route path="/history" component={History} />
        <Route path="/admin">
          <ProtectedRoute component={Admin} adminOnly />
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
