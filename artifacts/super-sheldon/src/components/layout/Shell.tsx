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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AiOrb from "../AiOrb";

export default function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("sheldon_token");
        setLocation("/login");
      }
    }
  });

  const { data: activeSessionData } = useGetActiveSession({
    query: { refetchInterval: 5000 } // Poll for active session
  });
  const finishSessionMutation = useFinishSession({
    mutation: {
      onSuccess: (report) => {
        setLocation(`/reports/${report.id}`);
      }
    }
  });

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/classes", label: "Classes", icon: Calendar },
    { href: "/reports", label: "AI Reports", icon: FileText },
    { href: "/performance", label: "Performance", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
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
            onClick={handleLogout}
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
              className="bg-primary/10 border-b border-primary/20"
            >
              <div className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AiOrb size="sm" isActive />
                  <div>
                    <p className="text-sm font-medium text-primary">AI is monitoring in background</p>
                    <p className="text-xs text-muted-foreground">
                      Class: {activeSessionData.class?.studentName} - {activeSessionData.class?.subject}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => finishSessionMutation.mutate({ sessionId: activeSessionData.session!.id })}
                  disabled={finishSessionMutation.isPending}
                >
                  {finishSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Finish Analysis
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
