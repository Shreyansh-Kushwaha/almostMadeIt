import { useGetDashboardStats, useListClasses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Users,
  BrainCircuit,
  Activity,
  Star,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import ChurnAlertsPanel from "@/components/ChurnAlertsPanel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MOCK_CHART_DATA = [
  { day: "Mon", score: 85 },
  { day: "Tue", score: 88 },
  { day: "Wed", score: 87 },
  { day: "Thu", score: 92 },
  { day: "Fri", score: 95 },
  { day: "Sat", score: 91 },
  { day: "Sun", score: 94 },
];

interface StatCardDef {
  title: string;
  value: string | number | undefined;
  change: number | undefined;
  icon: typeof Users;
  accent: string; // tailwind ring/bg accent color
  highlight?: boolean;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: classes, isLoading: classesLoading } = useListClasses({ status: "upcoming", limit: 3 });

  const upcomingClasses = classes?.items.slice(0, 3) ?? [];

  if (statsLoading || classesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statCards: StatCardDef[] = [
    { title: "Total Classes",  value: stats?.totalClasses,           change: stats?.totalClassesChange,    icon: Users,        accent: "from-sky-500/20 to-sky-500/0 text-sky-300" },
    { title: "Avg AI Score",   value: stats?.avgAiScore + "%",       change: stats?.avgAiScoreChange,      icon: BrainCircuit, accent: "from-primary/25 to-primary/0 text-primary",   highlight: true },
    { title: "Avg Engagement", value: stats?.avgEngagement + "%",    change: stats?.avgEngagementChange,   icon: Activity,     accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-300" },
    { title: "Weekly Rating",  value: stats?.weeklyRating,           change: stats?.weeklyRatingChange,    icon: Star,         accent: "from-amber-500/20 to-amber-500/0 text-amber-300" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> ClassPulse Overview</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Good to see you back</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's how the last seven days played out.</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[11px] text-muted-foreground">Live signal</p>
          <p className="text-sm font-mono text-primary">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="divider-gradient" />

      {/* KPI strip — polished cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const isUp = Number(stat.change) > 0;
          const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={`glass-card relative overflow-hidden ${
                  stat.highlight ? "border-primary/40 ring-1 ring-primary/20" : ""
                }`}
              >
                {/* Subtle radial accent in card */}
                <div
                  className={`pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.accent} blur-2xl`}
                />
                <CardHeader className="flex flex-row items-start justify-between pb-2 relative">
                  <div>
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </CardTitle>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${stat.accent} ring-1 ring-white/10`}
                  >
                    <stat.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  {stat.change != null && (
                    <div
                      className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                        isUp ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      <ChangeIcon className="w-3 h-3" />
                      <span>{isUp ? "+" : ""}{stat.change}%</span>
                      <span className="text-muted-foreground/70 font-normal">vs last week</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <p className="eyebrow">Performance</p>
              <CardTitle className="mt-1">AI Performance Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Daily overall score, last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Trending up</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                    itemStyle={{ color: "hsl(var(--primary))" }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingClasses.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No upcoming classes scheduled</p>
                )}
                {upcomingClasses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {c.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider px-2 py-1 bg-secondary/80 rounded-md text-muted-foreground font-medium">
                      {c.platform.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ChurnAlertsPanel limit={4} />
        </div>
      </div>
    </motion.div>
  );
}
