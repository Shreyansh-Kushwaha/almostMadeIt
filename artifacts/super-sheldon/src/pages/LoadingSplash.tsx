import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryOptions,
  getListClassesQueryOptions,
  getListStudentsQueryOptions,
  getGetDashboardStatsQueryOptions,
  getGetWeeklyPerformanceQueryOptions,
  getListChurnAlertsQueryOptions,
  getListReportsQueryOptions,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  CalendarDays,
  BarChart3,
  AlertTriangle,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import AiOrb from "@/components/AiOrb";

type PhaseStatus = "pending" | "active" | "done";

type Phase = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prefetch: (qc: ReturnType<typeof useQueryClient>) => Promise<unknown>;
};

const PHASES: Phase[] = [
  {
    key: "auth",
    label: "Authenticating teacher",
    icon: GraduationCap,
    prefetch: (qc) => qc.prefetchQuery(getGetMeQueryOptions()),
  },
  {
    key: "classes",
    label: "Loading classes",
    icon: CalendarDays,
    // Warm the first page that the Classes page renders by default.
    prefetch: (qc) => qc.prefetchQuery(getListClassesQueryOptions({ page: 1, limit: 12, status: "upcoming" })),
  },
  {
    key: "students",
    label: "Fetching students",
    icon: Users,
    prefetch: (qc) => qc.prefetchQuery(getListStudentsQueryOptions()),
  },
  {
    key: "stats",
    label: "Reading AI insights",
    icon: BarChart3,
    prefetch: async (qc) => {
      await Promise.all([
        qc.prefetchQuery(getGetDashboardStatsQueryOptions()),
        qc.prefetchQuery(getGetWeeklyPerformanceQueryOptions()),
      ]);
    },
  },
  {
    key: "churn",
    label: "Scanning churn signals",
    icon: AlertTriangle,
    prefetch: (qc) => qc.prefetchQuery(getListChurnAlertsQueryOptions()),
  },
  {
    key: "reports",
    label: "Loading recent reports",
    icon: FileText,
    prefetch: (qc) => qc.prefetchQuery(getListReportsQueryOptions()),
  },
];

const MIN_VISIBLE_MS = 1800;

export default function LoadingSplash() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState(0);
  const startedAt = useMemo(() => Date.now(), []);

  // Kick off all prefetches in parallel; mark each done independently.
  useEffect(() => {
    let cancelled = false;
    PHASES.forEach((phase) => {
      phase
        .prefetch(qc)
        .catch(() => undefined)
        .finally(() => {
          if (cancelled) return;
          setDoneKeys((prev) => {
            const next = new Set(prev);
            next.add(phase.key);
            return next;
          });
        });
    });
    return () => {
      cancelled = true;
    };
  }, [qc]);

  // Visually advance the "active" pointer through phases at a steady cadence
  // so the user sees motion even if some prefetches finish very fast.
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((idx) => (idx + 1 < PHASES.length ? idx + 1 : idx));
    }, 280);
    return () => clearInterval(interval);
  }, []);

  // Navigate to dashboard once every prefetch resolved AND minimum time elapsed.
  useEffect(() => {
    if (doneKeys.size < PHASES.length) return;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = setTimeout(() => {
      sessionStorage.removeItem("sheldon_just_logged_in");
      setLocation("/");
    }, remaining);
    return () => clearTimeout(t);
  }, [doneKeys, startedAt, setLocation]);

  const completedRatio = doneKeys.size / PHASES.length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 mb-4">
            <AiOrb size="md" isActive />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Preparing your dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Sheldon is pulling everything you need
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-card/60 overflow-hidden mb-6">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(completedRatio * 100)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Phase list */}
        <ul className="space-y-2">
          {PHASES.map((phase, idx) => {
            const isDone = doneKeys.has(phase.key);
            const status: PhaseStatus = isDone
              ? "done"
              : idx <= activeIdx
                ? "active"
                : "pending";
            return (
              <motion.li
                key={phase.key}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  status === "done"
                    ? "border-primary/30 bg-primary/5"
                    : status === "active"
                      ? "border-white/10 bg-card/50"
                      : "border-white/5 bg-card/30 opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    status === "done"
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {status === "done" ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.span>
                  ) : status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <phase.icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    status === "done" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {phase.label}
                </span>
                {status === "done" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-auto text-xs text-primary"
                  >
                    ready
                  </motion.span>
                )}
              </motion.li>
            );
          })}
        </ul>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          {doneKeys.size} of {PHASES.length} ready
        </p>
      </motion.div>
    </div>
  );
}
