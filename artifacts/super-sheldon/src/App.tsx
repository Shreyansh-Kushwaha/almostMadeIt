import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGetMe, setDemoHandler } from "@workspace/api-client-react";
import { getDemoResponse, isDemoMode } from "./lib/demoData";
import NotFound from "@/pages/not-found";

import Login from "./pages/Login";
import LoadingSplash from "./pages/LoadingSplash";
import Landing from "./pages/Landing";
import BackendStatusToast from "./components/BackendStatusToast";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import Monitor from "./pages/Monitor";
import Students from "./pages/Students";
import ParentDashboard from "./pages/ParentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
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
      setLocation("/welcome");
    }
  }, [token, setLocation]);

  if (!token) return null;

  return <Component />;
}

function MainLayout() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe();

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("sheldon_token");
      localStorage.removeItem("sheldon_demo_mode");
      setLocation("/welcome");
    }
  }, [isError, setLocation]);

  // Role-based redirect: the moment we know who the user is, push them to the
  // page that makes sense for their role if they're sitting on a default route.
  const role = (user as unknown as { role?: string } | undefined)?.role ?? "teacher";
  const userId = (user as unknown as { id?: number } | undefined)?.id;

  useEffect(() => {
    if (!user) return;
    // Student is locked to their own parent dashboard. Anything else snaps back.
    if (role === "student") {
      const allowed = userId != null && location === `/students/${userId}`;
      const isSettings = location === "/settings";
      if (!allowed && !isSettings) setLocation(`/students/${userId}`);
      return;
    }
    // Admin lands on /admin on first login.
    if (role === "admin" && location === "/") {
      setLocation("/admin");
    }
  }, [role, userId, location, user, setLocation]);

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
        <Route path="/students" component={() => <ProtectedRoute component={Students} />} />
        <Route path="/students/:studentId" component={() => <ProtectedRoute component={ParentDashboard} />} />
        <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} />} />
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
    // Hackathon-safe demo mode: when active, intercept every API call and
    // return canned fixture data instead of hitting the backend.
    setDemoHandler((method, url, body) => {
      if (!isDemoMode()) return null;
      return getDemoResponse(method, url, body);
    });
    return () => setDemoHandler(null);
  }, []);

  return (
    <Switch>
      <Route path="/welcome" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/loading" component={LoadingSplash} />
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
        <BackendStatusToast />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
