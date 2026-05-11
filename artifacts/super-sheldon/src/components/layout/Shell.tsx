import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMe,
  useLogout,
  useGetActiveSession,
  useFinishSession,
  getGetActiveSessionQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Activity,
  Settings,
  LogOut,
  Loader2,
  ExternalLink,
  GraduationCap,
  Building2,
} from "lucide-react";
import ClassPulseLogo from "../ClassPulseLogo";
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
        localStorage.removeItem("sheldon_demo_mode");
        setLocation("/login");
      },
    },
  });

  const { data: activeSessionData } = useGetActiveSession({
    query: { refetchInterval: 5000, queryKey: getGetActiveSessionQueryKey() },
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
    { href: "/students", label: "Students", icon: GraduationCap },
    { href: "/reports", label: "AI Reports", icon: FileText },
    { href: "/performance", label: "Performance", icon: Activity },
    { href: "/admin", label: "Admin", icon: Building2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — solid burnt-amber gradient, no translucency */}
      <aside
        className="w-64 flex flex-col text-sidebar-foreground border-r border-[hsl(18_70%_18%)] shadow-[6px_0_24px_-8px_rgba(0,0,0,0.45)] relative"
        style={{
          backgroundImage:
            "linear-gradient(180deg, hsl(24 72% 38%) 0%, hsl(20 75% 30%) 55%, hsl(18 80% 22%) 100%)",
        }}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[hsl(20_70%_22%)] rounded-xl p-1.5 border border-[hsl(22_60%_18%)]">
            <ClassPulseLogo size={26} inline className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-base tracking-tight text-white">ClassPulse</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(30_40%_82%)] font-medium">AI Platform</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors relative group ${
                    isActive
                      ? "bg-white text-[hsl(22_75%_28%)] font-semibold shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]"
                      : "text-[hsl(30_30%_92%)] hover:text-white hover:bg-[hsl(20_70%_24%)]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] transition-transform ${isActive ? "" : "group-hover:scale-110"}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[hsl(18_70%_18%)] space-y-3">
          {user && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[hsl(20_70%_22%)] border border-[hsl(22_60%_18%)]">
              <Avatar className="ring-2 ring-[hsl(30_60%_55%)] w-9 h-9">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-[hsl(22_75%_32%)] text-white text-sm font-semibold">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                <p className="text-[11px] text-[hsl(30_30%_82%)] truncate">{user.subject}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-[hsl(30_30%_88%)] hover:text-white hover:bg-[hsl(20_70%_24%)] h-9"
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
        {/* Ambient gradient orbs — soft brand glow against the navy bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-15%] right-[-10%] w-[40%] h-[55%] bg-primary/8 blur-[140px] rounded-full" />
          <div className="absolute bottom-[-20%] left-[20%] w-[35%] h-[40%] bg-[hsl(220_80%_30%)]/30 blur-[140px] rounded-full" />
        </div>
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
