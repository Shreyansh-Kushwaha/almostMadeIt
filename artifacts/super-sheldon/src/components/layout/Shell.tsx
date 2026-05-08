import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetActiveSession, useFinishSession } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Activity,
  Settings,
  LogOut,
  BrainCircuit,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AiOrb from "../AiOrb";
import FloatingAssistant from "../FloatingAssistant";
import { toast } from "sonner";

export default function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("sheldon_token");
        setLocation("/login");
      },
    },
  });

  const { data: activeSessionData } = useGetActiveSession({
    query: { refetchInterval: 5000 },
  });

  const finishSessionMutation = useFinishSession({
    mutation: {
      onSuccess: (report) => {
        setLocation(`/reports/${report.id}`);
        toast.success("AI Report generated!");
      },
    },
  });

  const openMonitorPopup = () => {
    if (!activeSessionData?.session) return;
    const token = localStorage.getItem("sheldon_token") ?? "";
    const { session, class: cls } = activeSessionData;
    const params = new URLSearchParams({
      sessionId: String(session.id),
      token,
      studentName: cls?.studentName ?? "Student",
      subject: cls?.subject ?? "Class",
    });
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(
      `${base}/monitor?${params.toString()}`,
      "sheldon_ai_monitor",
      "width=400,height=680,top=80,left=20,resizable=yes,scrollbars=no"
    );
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/classes", label: "Classes", icon: Calendar },
    { href: "/reports", label: "AI Reports", icon: FileText },
    { href: "/performance", label: "Performance", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-sidebar/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-primary" />
          <span className="font-bold text-xl tracking-tight">Sheldon AI</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40 space-y-4">
          {user && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Active Session Banner */}
        <AnimatePresence>
          {activeSessionData?.session && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-primary/10 border-b border-primary/20 shrink-0"
            >
              <div className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <AiOrb size="sm" isActive />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">AI monitoring in background</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeSessionData.class?.studentName} — {activeSessionData.class?.subject}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                    onClick={openMonitorPopup}
                    data-testid="button-open-monitor-banner"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open AI Window
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      finishSessionMutation.mutate({
                        sessionId: activeSessionData.session!.id,
                      })
                    }
                    disabled={finishSessionMutation.isPending}
                    data-testid="button-finish-analysis"
                  >
                    {finishSessionMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Finish Analysis
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>

      {/* Global floating AI assistant — visible on all pages */}
      <FloatingAssistant />
    </div>
  );
}
