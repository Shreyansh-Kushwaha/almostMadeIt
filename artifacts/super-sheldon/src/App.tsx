import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import Monitor from "./pages/Monitor";
import Shell from "./components/layout/Shell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("sheldon_token");

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  if (!token) return null;

  return <Component />;
}

function MainLayout() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe();

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("sheldon_token");
      setLocation("/login");
    }
  }, [isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <Shell>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/classes" component={() => <ProtectedRoute component={Classes} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
        <Route path="/reports/:reportId" component={() => <ProtectedRoute component={ReportDetail} />} />
        <Route path="/performance" component={() => <ProtectedRoute component={Performance} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function Router() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {/* Standalone monitor popup — no Shell, no auth redirect */}
      <Route path="/monitor" component={Monitor} />
      <Route path="*">
        <MainLayout />
      </Route>
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
